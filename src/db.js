import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

let client = null;
let db = null;
let isUsingLocalFallback = false;

function getDeepVal(obj, keyPath) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[keyPath] !== undefined) return obj[keyPath];
  const parts = keyPath.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
}

// In-memory / JSON fallback store if MongoDB Atlas is not yet connected or offline
class LocalCollection {
  constructor(name, getDbData, saveDbData) {
    this.name = name;
    this.getDbData = getDbData;
    this.saveDbData = saveDbData;
  }

  _getItems() {
    const data = this.getDbData();
    if (!data[this.name]) {
      data[this.name] = [];
      this.saveDbData(data);
    }
    return data[this.name];
  }

  _matches(item, query = {}) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        const matchOr = val.some(subQuery => this._matches(item, subQuery));
        if (!matchOr) return false;
        continue;
      }

      if (key === '_id') {
        const targetId = val?.toString?.() || val;
        const itemId = item._id?.toString?.() || item._id;
        if (itemId !== targetId) return false;
        continue;
      }

      const itemVal = getDeepVal(item, key);

      if (val && typeof val === 'object' && !(val instanceof RegExp)) {
        if (val.$regex !== undefined) {
          const reg = val.$regex instanceof RegExp ? val.$regex : new RegExp(val.$regex, val.$options || 'i');
          if (!reg.test(itemVal !== undefined && itemVal !== null ? itemVal.toString() : '')) return false;
        }
        if (val.$gte !== undefined && Number(itemVal) < Number(val.$gte)) return false;
        if (val.$lte !== undefined && Number(itemVal) > Number(val.$lte)) return false;
        if (val.$gt !== undefined && Number(itemVal) <= Number(val.$gt)) return false;
        if (val.$lt !== undefined && Number(itemVal) >= Number(val.$lt)) return false;
        if (val.$ne !== undefined && itemVal === val.$ne) return false;
        if (val.$in !== undefined && Array.isArray(val.$in) && !val.$in.includes(itemVal)) return false;
        if (val.$eq !== undefined && itemVal !== val.$eq) return false;
        continue;
      }

      if (val instanceof RegExp) {
        if (!val.test(itemVal !== undefined && itemVal !== null ? itemVal.toString() : '')) return false;
        continue;
      }

      if (itemVal !== val) return false;
    }
    return true;
  }

  find(query = {}) {
    const items = this._getItems();
    const filtered = items.filter(item => this._matches(item, query));

    return {
      _data: [...filtered],
      sort(sortObj) {
        const [field, order] = Object.entries(sortObj)[0] || [];
        if (field) {
          this._data.sort((a, b) => {
            const valA = getDeepVal(a, field);
            const valB = getDeepVal(b, field);
            if (typeof valA === 'number' && typeof valB === 'number') {
              return order === 1 ? valA - valB : valB - valA;
            }
            if (valA < valB) return order === 1 ? -1 : 1;
            if (valA > valB) return order === 1 ? 1 : -1;
            return 0;
          });
        }
        return this;
      },
      skip(n) {
        this._data = this._data.slice(n);
        return this;
      },
      limit(n) {
        this._data = this._data.slice(0, n);
        return this;
      },
      async toArray() {
        return this._data;
      }
    };
  }

  async findOne(query = {}) {
    const cursor = await this.find(query);
    const arr = await cursor.toArray();
    return arr[0] || null;
  }

  async insertOne(doc) {
    const data = this.getDbData();
    const newDoc = {
      ...doc,
      _id: doc._id || new ObjectId().toString(),
      createdAt: doc.createdAt || new Date().toISOString()
    };
    if (!data[this.name]) data[this.name] = [];
    data[this.name].push(newDoc);
    this.saveDbData(data);
    return { insertedId: newDoc._id, acknowledged: true };
  }

  async updateOne(filter, update) {
    const data = this.getDbData();
    const items = data[this.name] || [];
    const index = items.findIndex(item => this._matches(item, filter));

    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };

    if (update.$set) {
      items[index] = { ...items[index], ...update.$set, updatedAt: new Date().toISOString() };
    } else {
      items[index] = { ...items[index], ...update, updatedAt: new Date().toISOString() };
    }
    data[this.name] = items;
    this.saveDbData(data);
    return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
  }

  async deleteOne(filter) {
    const data = this.getDbData();
    const items = data[this.name] || [];
    const initialLen = items.length;
    data[this.name] = items.filter(item => !this._matches(item, filter));
    this.saveDbData(data);
    return { deletedCount: initialLen - data[this.name].length, acknowledged: true };
  }

  async countDocuments(query = {}) {
    const cursor = await this.find(query);
    const arr = await cursor.toArray();
    return arr.length;
  }
}

class LocalDatabase {
  constructor(filePath) {
    this.originalFilePath = filePath;
    this.memoryCache = null;

    // Detect serverless environment or read-only filesystem
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (() => {
      try {
        const testDir = path.dirname(filePath);
        if (!fs.existsSync(testDir)) return true;
        fs.accessSync(testDir, fs.constants.W_OK);
        return false;
      } catch {
        return true;
      }
    })();

    if (isServerless) {
      this.filePath = path.join('/tmp', 'gearup_local_db.json');
      try {
        if (!fs.existsSync(this.filePath) && fs.existsSync(this.originalFilePath)) {
          const initialData = fs.readFileSync(this.originalFilePath, 'utf-8');
          fs.writeFileSync(this.filePath, initialData, 'utf-8');
        }
      } catch (e) {
        console.warn('Could not initialize /tmp db copy:', e.message);
      }
    } else {
      this.filePath = filePath;
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}), 'utf-8');
      }
    }
  }

  getDbData() {
    if (this.memoryCache) return this.memoryCache;
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.memoryCache = JSON.parse(content || '{}');
        return this.memoryCache;
      }
      if (fs.existsSync(this.originalFilePath)) {
        const content = fs.readFileSync(this.originalFilePath, 'utf-8');
        this.memoryCache = JSON.parse(content || '{}');
        return this.memoryCache;
      }
      this.memoryCache = {};
      return this.memoryCache;
    } catch {
      this.memoryCache = this.memoryCache || {};
      return this.memoryCache;
    }
  }

  saveDbData(data) {
    this.memoryCache = data;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      const tmpPath = path.join('/tmp', 'gearup_local_db.json');
      if (this.filePath !== tmpPath) {
        try {
          this.filePath = tmpPath;
          fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
          return;
        } catch {}
      }
      console.warn('Local database file write notice:', err.message);
    }
  }

  collection(name) {
    return new LocalCollection(name, () => this.getDbData(), data => this.saveDbData(data));
  }
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.startsWith('mongodb') && !uri.includes('username:password')) {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000
      });
      await client.connect();
      db = client.db(process.env.DB_NAME || 'equipment_rental_db');
      console.log('✅ Connected successfully to MongoDB Atlas');
      return db;
    } catch (err) {
      console.warn('⚠️ MongoDB Atlas connection error:', err.message);
      console.log('🔄 Activating high-performance local persistent store fallback...');
    }
  } else {
    console.log('ℹ️ No external MongoDB URI configured yet. Using local persistent store.');
  }

  isUsingLocalFallback = true;
  db = new LocalDatabase(LOCAL_DB_PATH);
  console.log('✅ Local persistent JSON database ready at:', LOCAL_DB_PATH);
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Please call connectDB first.');
  }
  return db;
}

export { ObjectId };

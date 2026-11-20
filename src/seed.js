import bcrypt from 'bcryptjs';
import { connectDB, getDB } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

export async function seedDatabase() {
  await connectDB();
  const db = getDB();

  console.log('🌱 Seeding database with initial data...');

  // 1. Seed Users (Admin, Owner, Customer)
  const existingAdmin = await db.collection('users').findOne({ email: 'admin@rentalequip.com' });
  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
    const ownerPasswordHash = await bcrypt.hash('OwnerPassword123!', 10);
    const customerPasswordHash = await bcrypt.hash('CustomerPassword123!', 10);

    const initialUsers = [
      {
        name: 'System Administrator',
        email: 'admin@rentalequip.com',
        password: adminPasswordHash,
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        role: 'Admin',
        phone: '+880 1711-000001',
        address: 'Level 14, Concord Tower, Banglamotor, Dhaka-1000',
        createdAt: new Date().toISOString()
      },
      {
        name: 'Apex Equipment Pro',
        email: 'owner@rentalequip.com',
        password: ownerPasswordHash,
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        role: 'Owner',
        phone: '+880 1819-223344',
        address: 'Plot 14-15, Tejgaon Light Industrial Area, Dhaka-1208',
        createdAt: new Date().toISOString()
      },
      {
        name: 'Tanvir Ahmed',
        email: 'customer@rentalequip.com',
        password: customerPasswordHash,
        photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        role: 'Customer',
        phone: '+880 1912-889900',
        address: 'House 42, Road 11, Banani DOHS, Dhaka-1213',
        createdAt: new Date().toISOString()
      }
    ];

    for (const u of initialUsers) {
      await db.collection('users').insertOne(u);
    }
    console.log('✅ Default users seeded (Admin, Owner, Customer).');
  }

  // 2. Clear old equipment and re-seed all 10 categories
  const allEquipment = [
    {
      name: 'CAT 320 Hydraulic Excavator',
      description: 'Industry-standard 20-ton tracked hydraulic excavator equipped with high-efficiency Grade Assist, quick coupler, and 1.2 cubic yard digging bucket. Ideal for heavy earthmoving, trenching, and commercial site prep.',
      category: 'Excavators',
      location: 'Tejgaon Industrial Area, Dhaka',
      rentalPrice: 35000,
      rentalType: 'Daily',
      availableQuantity: 3,
      condition: 'Excellent',
      brand: 'Caterpillar',
      model: 'CAT 320 Next Gen',
      image: 'https://images.unsplash.com/photo-1503708928676-1cb796a0891e?auto=format&fit=crop&w=1200&q=80',
      terms: 'Operator license required. Fuel replaced on return or billed at standard market rate. Safety compliance mandatory before dispatch.',
      status: 'Approved',
      rating: 4.9,
      reviewCount: 38,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
    },
    {
      name: 'Liebherr LTM 1100 All-Terrain Mobile Crane',
      description: '100-ton capacity mobile crane featuring a 60m telescopic boom, bi-fold swing-away jib, active rear-axle steering, and load moment limiter. Perfect for structural steel erection and industrial lifting.',
      category: 'Cranes',
      location: 'Agrabad Commercial Area, Chattogram',
      rentalPrice: 125000,
      rentalType: 'Daily',
      availableQuantity: 2,
      condition: 'Inspected & Certified',
      brand: 'Liebherr',
      model: 'LTM 1100-4.2',
      image: 'https://images.unsplash.com/photo-1575538633395-c773c6ea252d?auto=format&fit=crop&w=1200&q=80',
      terms: 'Certified heavy crane operator provided. Outrigger ground pad setup included. Minimum 2-day rental schedule.',
      status: 'Approved',
      rating: 5.0,
      reviewCount: 22,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString()
    },
    {
      name: 'Cummins 150kW Tier 4 Diesel Generator',
      description: 'Sound-attenuated mobile commercial generator delivering 150kW/187kVA prime power. Equipped with multi-voltage selector, digital controller, and 24-hour on-board fuel cell.',
      category: 'Generators',
      location: 'Shiddhirganj Industrial Hub, Narayanganj',
      rentalPrice: 25000,
      rentalType: 'Daily',
      availableQuantity: 4,
      condition: 'Like New',
      brand: 'Cummins',
      model: 'QSB7-G5 Silent',
      image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Dieselgenerator.jpg',
      terms: 'Distribution panel and heavy-duty 4-core cables included upon request. Standard diesel only.',
      status: 'Approved',
      rating: 4.8,
      reviewCount: 45,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
    },
    {
      name: 'Toyota 8FGU25 Heavy-Duty Pneumatic Forklift',
      description: '5,000 lbs lifting capacity rough-terrain forklift with dual pneumatic tires, side-shifter, 189-inch tri-stage mast, and System of Active Stability (SAS). Ideal for yard unloading and heavy materials handling.',
      category: 'Forklifts',
      location: 'Tongi Industrial Zone, Gazipur',
      rentalPrice: 15000,
      rentalType: 'Daily',
      availableQuantity: 5,
      condition: 'Excellent',
      brand: 'Toyota Industrial',
      model: '8FGU25 Core IC',
      image: 'https://images.unsplash.com/photo-1645736315000-6f788915923b?auto=format&fit=crop&w=1200&q=80',
      terms: 'Propane/Diesel tank provided full. Indoor/outdoor pneumatic tires. Certified forklift operator required.',
      status: 'Approved',
      rating: 4.9,
      reviewCount: 31,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString()
    },
    {
      name: 'Caterpillar D6T Heavy Crawler Bulldozer',
      description: '215 HP heavy track-type tractor equipped with semi-universal blade, multi-shank ripper, differential steering, and Trimble 3D Grade Control. The premier dozer for bulk grading and earth shaping.',
      category: 'Bulldozers',
      location: 'Matarbari Power Hub, Cox\'s Bazar',
      rentalPrice: 55000,
      rentalType: 'Daily',
      availableQuantity: 2,
      condition: 'Excellent',
      brand: 'Caterpillar',
      model: 'D6T XL Tier 4F',
      image: 'https://images.unsplash.com/photo-1651260282644-6b3763d2acbc?auto=format&fit=crop&w=1200&q=80',
      terms: 'Lowbed transport trailer dispatch arranged across Bangladesh. Daily maintenance log required.',
      status: 'Approved',
      rating: 5.0,
      reviewCount: 19,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
    },
    {
      name: 'John Deere 544P Wheel Loader',
      description: '3.0 cubic yard capacity articulated wheel loader with 166 HP engine, auto-shift transmission, ride control, and quick-attach bucket with reversible cutting edge.',
      category: 'Loaders',
      location: 'Rupsha Industrial Belt, Khulna',
      rentalPrice: 40000,
      rentalType: 'Daily',
      availableQuantity: 3,
      condition: 'Like New',
      brand: 'John Deere',
      model: '544P Production Series',
      image: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Caterpillar_950k_Wheel_Loader.jpg',
      terms: 'Clean cab return expected. Standard machinery protection policy applies.',
      status: 'Approved',
      rating: 4.9,
      reviewCount: 27,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    {
      name: 'Multiquip Whiteman 9-Cu-Ft Towable Concrete Mixer',
      description: 'Commercial towable batch concrete mixer powered by Honda GX240 engine. Features high-tensile steel drum, easy-clean paddles, and heavy-duty tow bar with safety chains.',
      category: 'Concrete Mixers',
      location: 'EPZ Commercial Area, Savar',
      rentalPrice: 8500,
      rentalType: 'Daily',
      availableQuantity: 6,
      condition: 'Clean & Calibrated',
      brand: 'Multiquip',
      model: 'MC94PH8',
      image: 'https://images.unsplash.com/photo-1527410651988-c2f385ccd3f7?auto=format&fit=crop&w=1200&q=80',
      terms: 'Drum must be washed immediately after daily usage. Tow hitch provided.',
      status: 'Approved',
      rating: 4.7,
      reviewCount: 40,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
    },
    {
      name: 'Peterbilt 348 Heavy-Duty Tandem Dump Truck',
      description: 'PACCAR PX-9 powered 16-yard Ox Bodies steel dump body, 450 HP, automatic transmission, air-ride suspension, and electric roll tarp. Rated for asphalt, gravel, and demolition waste hauling.',
      category: 'Trucks',
      location: 'Ghorashal Power Plant Road, Narsingdi',
      rentalPrice: 45000,
      rentalType: 'Daily',
      availableQuantity: 3,
      condition: 'Inspected',
      brand: 'Peterbilt',
      model: '348 Heavy Haul',
      image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
      terms: 'Valid commercial driving license mandatory. Local hauling within region.',
      status: 'Approved',
      rating: 4.9,
      reviewCount: 29,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
    },
    {
      name: 'Genie S-65 Telescopic Rough-Terrain Boom Lift',
      description: 'Diesel 4WD self-propelled telescopic aerial boom lift featuring 71 ft max working height, 56 ft horizontal reach, and 500 lbs dual capacity basket with 360-degree continuous rotation.',
      category: 'Lifting Equipment',
      location: 'South Surma Industrial Area, Sylhet',
      rentalPrice: 32000,
      rentalType: 'Daily',
      availableQuantity: 4,
      condition: 'Certified',
      brand: 'Genie',
      model: 'S-65 TraX 4WD',
      image: 'https://images.unsplash.com/photo-1756402664856-91a90f90b70b?auto=format&fit=crop&w=1200&q=80',
      terms: 'Safety harness required. Safety inspection certificate renewed monthly.',
      status: 'Approved',
      rating: 5.0,
      reviewCount: 52,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
    },
    {
      name: 'Wacker Neuson DPU6555 Heavy Reversible Plate Compactor',
      description: '1,100 lbs high-impact reversible plate compactor with 65 kN compaction force, 28-inch base plate, integrated hour meter, and low hand-arm vibration guide handle.',
      category: 'Other Machinery',
      location: 'BSIC Industrial Estate, Bogura',
      rentalPrice: 9500,
      rentalType: 'Daily',
      availableQuantity: 5,
      condition: 'Excellent',
      brand: 'Wacker Neuson',
      model: 'DPU6555He',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Roadroller.jpg',
      terms: 'Diesel engine. Tie-down straps and ramp provided for pickup.',
      status: 'Approved',
      rating: 4.8,
      reviewCount: 18,
      ownerEmail: 'owner@rentalequip.com',
      ownerName: 'Apex Equipment Pro',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
    }
  ];

  // Upsert all equipment so we always have all 10 categories
  for (const eq of allEquipment) {
    const existing = await db.collection('equipment').findOne({ name: eq.name });
    if (!existing) {
      await db.collection('equipment').insertOne(eq);
    } else {
      await db.collection('equipment').updateOne({ name: eq.name }, { $set: eq });
    }
  }

  // Ensure all auxiliary catalog items also use authentic Bangladeshi locations and BDT rates
  const bdLocationsMap = {
    'Sony FX3 Full-Frame Cinema Package': { location: 'Dhanmondi Media Hub, Dhaka', price: 18500 },
    'Ford F-550 Super Duty Flatbed Truck': { location: 'Halishahar Commercial Area, Chattogram', price: 35000 },
    'John Deere 6R 195 Utility Farm Tractor': { location: 'Dinajpur Modern Agri Hub, Dinajpur', price: 28000 },
    'DJI Matrice 350 RTK Commercial Drone': { location: 'Uttara Sector 7, Dhaka', price: 22000 },
    'JBL VTX A8 Compact Line Array Sound System': { location: 'Gulshan-2 Convention Area, Dhaka', price: 65000 },
    'Bobcat T770 Compact Track Loader': { location: 'Kanchpur Industrial Zone, Narayanganj', price: 28000 },
    'RED Komodo 6K Production Kit': { location: 'Banasree Studio Hub, Dhaka', price: 20000 },
    'Genie S-65 Telescopic Boom Lift': { location: 'Patenga Industrial Port, Chattogram', price: 32000 },
    'Chauvet Rogue R3 Beam Stage Lights (Pack of 4)': { location: 'Mirpur DOHS Convention Zone, Dhaka', price: 15000 },
    'Kubota M7-172 Deluxe Tractor with Loader': { location: 'Rangpur Agricultural Area, Rangpur', price: 25000 },
    'Fluke Ti480 PRO High-Resolution Thermal Imager': { location: 'Motijheel Commercial Hub, Dhaka', price: 12000 }
  };

  for (const [name, data] of Object.entries(bdLocationsMap)) {
    await db.collection('equipment').updateOne(
      { name },
      { $set: { location: data.location, rentalPrice: data.price } }
    );
  }

  console.log(`✅ Seeded all categories with Bangladeshi locations and BDT amounts.`);
  console.log('🎉 Database seeding complete!');
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

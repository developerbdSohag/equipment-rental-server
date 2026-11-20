import bcrypt from 'bcryptjs';
import { connectDB, getDB } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

export async function seedDatabase() {
  await connectDB();
  const db = getDB();

  console.log('🌱 Seeding database with initial data...');

  // 1. Seed Users
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
        phone: '+1 (555) 019-2831',
        address: '100 Metro Tower Blvd, New York, NY',
        createdAt: new Date().toISOString()
      },
      {
        name: 'Apex Equipment Pro',
        email: 'owner@rentalequip.com',
        password: ownerPasswordHash,
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        role: 'Owner',
        phone: '+1 (555) 482-9912',
        address: '450 Industrial Parkway, Chicago, IL',
        createdAt: new Date().toISOString()
      },
      {
        name: 'Alex Rivera',
        email: 'customer@rentalequip.com',
        password: customerPasswordHash,
        photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
        role: 'Customer',
        phone: '+1 (555) 773-8821',
        address: '742 Evergreen Terrace, Springfield, OR',
        createdAt: new Date().toISOString()
      }
    ];

    for (const u of initialUsers) {
      await db.collection('users').insertOne(u);
    }
    console.log('✅ Default users seeded (Admin, Owner, Customer).');
  }

  // 2. Seed Equipment
  const equipmentCount = await db.collection('equipment').countDocuments({});
  if (equipmentCount === 0) {
    const sampleEquipment = [
      {
        name: 'CAT 320 Hydraulic Excavator',
        description: 'Industry-standard 20-ton tracked hydraulic excavator equipped with high-efficiency Grade Assist, quick coupler, and 1.2 cubic yard digging bucket. Ideal for heavy earthmoving, trenching, and commercial site prep.',
        category: 'Construction Equipment',
        location: 'Chicago, IL',
        rentalPrice: 450,
        rentalType: 'Daily',
        availableQuantity: 3,
        condition: 'Excellent',
        brand: 'Caterpillar',
        model: 'CAT 320 Next Gen',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
        terms: 'Operator license required. Fuel replaced on return or billed at $5/gal. Insurance certificate mandatory before dispatch.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
      },
      {
        name: 'Sony FX3 Full-Frame Cinema Package',
        description: 'Compact cinema line camera featuring 4K 120fps recording, 15+ stops dynamic range, S-Cinetone color science, XLR top handle, Tilta cage, 2x 160GB CFexpress Type A cards, and 4x NP-FZ100 batteries.',
        category: 'Photography Equipment',
        location: 'Los Angeles, CA',
        rentalPrice: 160,
        rentalType: 'Daily',
        availableQuantity: 4,
        condition: 'Like New',
        brand: 'Sony',
        model: 'ILME-FX3',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
        terms: 'Security deposit held on credit card. Pre-rental inspection check mandatory upon handover.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
      },
      {
        name: 'Ford F-550 Super Duty Flatbed Truck',
        description: '19,500 lbs GVWR commercial flatbed equipped with 6.7L Power Stroke Turbo Diesel, 16-foot steel diamond plate deck, stake pockets, and electric brake controller. Perfect for hauling heavy machinery.',
        category: 'Vehicles & Transportation',
        location: 'Dallas, TX',
        rentalPrice: 1200,
        rentalType: 'Weekly',
        availableQuantity: 2,
        condition: 'Excellent',
        brand: 'Ford',
        model: 'F-550 Super Duty',
        image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1000&q=80',
        terms: 'Commercial driver verification required. 500 miles/week included; $0.45 per additional mile.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
      },
      {
        name: 'John Deere 6R 195 Utility Farm Tractor',
        description: '195 HP intelligent agricultural tractor with AutoTrac guidance, CommandPro joystick, IVT transmission, front hitch, and high-flow triple hydraulic remotes. Unbeatable power for tillage and harvesting.',
        category: 'Agriculture Equipment',
        location: 'Des Moines, IA',
        rentalPrice: 520,
        rentalType: 'Daily',
        availableQuantity: 2,
        condition: 'Excellent',
        brand: 'John Deere',
        model: '6R 195',
        image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
        terms: 'Farm liability waiver required. Clean engine and implements upon return.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      },
      {
        name: 'DJI Matrice 350 RTK Commercial Drone',
        description: 'Flagship enterprise drone system with 55-minute max flight time, IP55 rating, night-vision FPV camera, Zenmuse H20T thermal sensor, dual controller setup, and D-RTK 2 mobile station.',
        category: 'Electronics',
        location: 'Seattle, WA',
        rentalPrice: 380,
        rentalType: 'Daily',
        availableQuantity: 3,
        condition: 'Mint',
        brand: 'DJI Enterprise',
        model: 'Matrice 350 RTK',
        image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1000&q=80',
        terms: 'FAA Part 107 certified pilot only. Flight logs must be synchronized upon return.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
      },
      {
        name: 'JBL VTX A8 Compact Line Array Sound System',
        description: 'Touring-grade active line array sound system including 8x VTX A8 dual 8-inch elements, 4x B18 single 18-inch subwoofers, Crown I-Tech HD amplification racks, and suspension rigging hardware.',
        category: 'Event Equipment',
        location: 'Miami, FL',
        rentalPrice: 1450,
        rentalType: 'Daily',
        availableQuantity: 2,
        condition: 'Professional Grade',
        brand: 'JBL Professional',
        model: 'VTX A8 Concert Rig',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80',
        terms: 'Certified audio technician required on site. Weather protection covers provided and required outdoors.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
      },
      {
        name: 'Bobcat T770 Compact Track Loader',
        description: '92 HP vertical lift path compact track loader featuring high-flow auxiliary hydraulics, enclosed heated/cooled cab, rubber tracks, and 84-inch heavy duty bucket with bolt-on edge.',
        category: 'Construction Equipment',
        location: 'Minneapolis, MN',
        rentalPrice: 340,
        rentalType: 'Daily',
        availableQuantity: 4,
        condition: 'Excellent',
        brand: 'Bobcat',
        model: 'T770 Tier 4',
        image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
        terms: 'Tracks must be washed before return. Minimum 1-day rental.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
      },
      {
        name: 'RED Komodo 6K Production Kit',
        description: 'Complete cinema production kit including RED Komodo 6K global shutter body, Canon RF-EF adapter with ND filter, SmallHD monitor, 4x V-mount batteries, and Pelican air travel case.',
        category: 'Photography Equipment',
        location: 'New York, NY',
        rentalPrice: 220,
        rentalType: 'Daily',
        availableQuantity: 2,
        condition: 'Mint',
        brand: 'RED Digital Cinema',
        model: 'Komodo 6K',
        image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80',
        terms: 'Government-issued ID and equipment insurance certificate required.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
      },
      {
        name: 'Genie S-65 Telescopic Boom Lift',
        description: 'Rough terrain 4WD diesel telescopic boom lift with 71 ft working height, 56 ft horizontal reach, and 500 lbs platform capacity. Self-leveling platform with 160-degree hydraulic rotation.',
        category: 'Construction Equipment',
        location: 'Denver, CO',
        rentalPrice: 380,
        rentalType: 'Daily',
        availableQuantity: 1,
        condition: 'Inspected & Certified',
        brand: 'Genie',
        model: 'S-65 4WD',
        image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1000&q=80',
        terms: 'Harness and OSHA aerial lift certification required for all operators.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
      },
      {
        name: 'Chauvet Rogue R3 Beam Stage Lights (Pack of 4)',
        description: 'High-intensity moving head beam fixtures with 300W R3 discharge lamp, motorized focus, dual rotating prisms, and road cases. Outstanding punch for concert stages and festivals.',
        category: 'Event Equipment',
        location: 'Nashville, TN',
        rentalPrice: 280,
        rentalType: 'Daily',
        availableQuantity: 3,
        condition: 'Excellent',
        brand: 'Chauvet Professional',
        model: 'Rogue R3 Beam',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80',
        terms: 'Includes DMX cables and safety cables. Clamp rigging required.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
      },
      {
        name: 'Kubota M7-172 Deluxe Tractor with Loader',
        description: '168 HP commercial farm tractor with K-VT continuously variable transmission, LM2605 front loader, 3-point hitch, and ergonomic multi-function armrest controller.',
        category: 'Agriculture Equipment',
        location: 'Kansas City, MO',
        rentalPrice: 480,
        rentalType: 'Daily',
        availableQuantity: 2,
        condition: 'Like New',
        brand: 'Kubota',
        model: 'M7-172',
        image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
        terms: 'Fuel tank must be returned full. Valid ag operations license required.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date().toISOString()
      },
      {
        name: 'Fluke Ti480 PRO High-Resolution Thermal Imager',
        description: '640 x 480 thermal resolution infrared camera featuring SuperResolution (up to 1280 x 960), LaserSharp Auto Focus, wireless data transmission, and high-temp measurement up to 1000°C.',
        category: 'Electronics',
        location: 'Austin, TX',
        rentalPrice: 195,
        rentalType: 'Daily',
        availableQuantity: 4,
        condition: 'Calibrated',
        brand: 'Fluke',
        model: 'Ti480 PRO',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
        terms: 'Calibration seal must remain intact. Hard transport case and 2 batteries included.',
        status: 'Approved',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        createdAt: new Date().toISOString()
      }
    ];

    for (const eq of sampleEquipment) {
      await db.collection('equipment').insertOne(eq);
    }
    console.log(`✅ Seeded ${sampleEquipment.length} high-quality equipment items.`);
  }

  // 3. Seed Sample Bookings & Payments for Analytics
  const bookingsCount = await db.collection('bookings').countDocuments({});
  if (bookingsCount === 0) {
    const sampleBookings = [
      {
        equipmentName: 'CAT 320 Hydraulic Excavator',
        equipmentImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
        category: 'Construction Equipment',
        rentalPrice: 450,
        rentalType: 'Daily',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        customerEmail: 'customer@rentalequip.com',
        customerName: 'Alex Rivera',
        contactNumber: '+1 555-773-8821',
        deliveryAddress: '742 Evergreen Terrace, Springfield, OR',
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        durationDays: 3,
        quantity: 1,
        totalAmount: 1350,
        paymentStatus: 'Paid',
        bookingStatus: 'Completed',
        transactionId: 'TXN_CAT320_PAID_01',
        createdAt: '2026-10-29T10:00:00.000Z'
      },
      {
        equipmentName: 'Sony FX3 Full-Frame Cinema Package',
        equipmentImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
        category: 'Photography Equipment',
        rentalPrice: 160,
        rentalType: 'Daily',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        customerEmail: 'customer@rentalequip.com',
        customerName: 'Alex Rivera',
        contactNumber: '+1 555-773-8821',
        deliveryAddress: '340 Studio Lane, Los Angeles, CA',
        startDate: '2026-11-12',
        endDate: '2026-11-15',
        durationDays: 3,
        quantity: 1,
        totalAmount: 480,
        paymentStatus: 'Paid',
        bookingStatus: 'Completed',
        transactionId: 'TXN_SONYFX3_PAID_02',
        createdAt: '2026-11-10T14:30:00.000Z'
      },
      {
        equipmentName: 'DJI Matrice 350 RTK Commercial Drone',
        equipmentImage: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1000&q=80',
        category: 'Electronics',
        rentalPrice: 380,
        rentalType: 'Daily',
        ownerEmail: 'owner@rentalequip.com',
        ownerName: 'Apex Equipment Pro',
        customerEmail: 'customer@rentalequip.com',
        customerName: 'Alex Rivera',
        contactNumber: '+1 555-773-8821',
        deliveryAddress: 'Survey Site 12, Seattle, WA',
        startDate: '2026-11-22',
        endDate: '2026-11-25',
        durationDays: 3,
        quantity: 1,
        totalAmount: 1140,
        paymentStatus: 'Paid',
        bookingStatus: 'Confirmed',
        transactionId: 'TXN_DJIMATRICE_PAID_03',
        createdAt: '2026-11-18T09:15:00.000Z'
      }
    ];

    for (const b of sampleBookings) {
      const res = await db.collection('bookings').insertOne(b);
      await db.collection('payments').insertOne({
        bookingId: res.insertedId,
        equipmentName: b.equipmentName,
        customerEmail: b.customerEmail,
        ownerEmail: b.ownerEmail,
        amount: b.totalAmount,
        currency: 'usd',
        transactionId: b.transactionId,
        paymentMethod: 'Stripe Card',
        paymentDate: b.createdAt,
        status: 'Succeeded'
      });
    }
    console.log('✅ Seeded sample bookings and payments.');
  }

  console.log('🎉 Database seeding complete!');
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

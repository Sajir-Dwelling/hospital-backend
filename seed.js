require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  // Clear existing users
  await User.deleteMany({});
  console.log('🗑️  Cleared users');

  const users = [
    // Admin
    {
      name: 'Admin User',
      email: 'admin@hms.com',
      password: 'admin123',
      role: 'admin',
      avatar: 'AD',
      phone: '01700-000000',
    },
    // Doctors
    {
      name: 'Dr. Nusrat Khan',
      email: 'doctor@hms.com',
      password: 'doctor123',
      role: 'doctor',
      avatar: 'NK',
      department: 'Cardiology',
      qualification: 'MBBS, MD (Cardiology)',
      experience: '12 years',
      phone: '01711-001001',
      rating: 4.9,
    },
    {
      name: 'Dr. Tariq Hossain',
      email: 'tariq@hms.com',
      password: 'doctor123',
      role: 'doctor',
      avatar: 'TH',
      department: 'Neurology',
      qualification: 'MBBS, MD (Neurology)',
      experience: '8 years',
      phone: '01711-002002',
      rating: 4.7,
    },
    {
      name: 'Dr. Fariha Islam',
      email: 'fariha@hms.com',
      password: 'doctor123',
      role: 'doctor',
      avatar: 'FI',
      department: 'Orthopedics',
      qualification: 'MBBS, MS (Orthopedics)',
      experience: '6 years',
      phone: '01711-003003',
      rating: 4.8,
    },
    // Patients
    {
      name: 'Rafiq Ahmed',
      email: 'patient@hms.com',
      password: 'patient123',
      role: 'patient',
      avatar: 'RA',
      age: 45,
      bloodGroup: 'B+',
      phone: '01800-111111',
      address: 'House 12, Road 4, Dhanmondi, Dhaka',
    },
    {
      name: 'Nadia Rahman',
      email: 'nadia@hms.com',
      password: 'patient123',
      role: 'patient',
      avatar: 'NR',
      age: 28,
      bloodGroup: 'AB+',
      phone: '01800-222222',
    },
  ];

  for (const u of users) {
    await User.create(u);
    console.log(`✅ Created: ${u.email} (${u.role})`);
  }

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo credentials:');
  console.log('  admin@hms.com   / admin123');
  console.log('  doctor@hms.com  / doctor123');
  console.log('  patient@hms.com / patient123');

  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

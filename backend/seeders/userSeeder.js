const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

/**
 * User Seeder
 * 
 * Creates default admin and parent users for development/testing
 * Run with: node seeders/userSeeder.js
 */

const users = [
  {
    name: 'Super Admin',
    email: 'super@gmail.com',
    password: 'Jejomar@09',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Parent User',
    email: 'parent@gmail.com',
    password: 'Jejomar@09',
    role: 'parent',
    isActive: true,
  },
];

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Clear existing users (optional - comment out if you want to keep existing users)
    // await User.deleteMany({ email: { $in: users.map(u => u.email) } });
    // console.log('Cleared existing seed users');

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping...`);
        // Update password if needed (optional)
        existingUser.password = userData.password;
        await existingUser.save();
        console.log(`Updated password for ${userData.email}`);
        createdUsers.push(existingUser);
      } else {
        const user = await User.create(userData);
        console.log(`Created user: ${user.email} (${user.role})`);
        createdUsers.push(user);
      }
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log(`Created/Updated ${createdUsers.length} users:`);
    createdUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

// Run seeder
seedUsers();


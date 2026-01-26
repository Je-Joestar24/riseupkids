const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Badge = require('../models/Badge');
const User = require('../models/User');

// Load environment variables
dotenv.config();

/**
 * Badge Seeder
 * 
 * Seeds all static badges (level, content-type, streak, completion)
 * Icons are NOT stored - frontend handles icons via mapping
 * Run with: node scripts/seedBadges.js
 */

const seedBadges = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`[BadgeSeeder] MongoDB Connected: ${conn.connection.host}`);

    // Get admin user for createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('Admin user not found. Please create an admin user first (run userSeeder.js).');
    }
    console.log(`[BadgeSeeder] Using admin user: ${adminUser.email}`);

    // Define all static badges
    // Note: icon and image are NOT included - frontend handles icons via mapping
    // These fields remain optional in Badge model for future custom badges
    const badges = [
      // ============================================
      // LEVEL BADGES (Automatically awarded)
      // ============================================
      {
        name: 'First Star',
        description: 'Earned your first star! Keep up the great work!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 1,
          metadata: {},
        },
        rarity: 'common',
        order: 1,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Getting Started',
        description: 'Earned 10 stars! You\'re on your way!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 10,
          metadata: {},
        },
        rarity: 'common',
        order: 2,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Star Beginner',
        description: 'Earned 25 stars! Great progress!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 25,
          metadata: {},
        },
        rarity: 'common',
        order: 3,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Rising Star',
        description: 'Earned 50 stars! You\'re rising fast!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 50,
          metadata: {},
        },
        rarity: 'uncommon',
        order: 4,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Super Learner',
        description: 'Earned over 100 stars! You\'re a super learner!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 100,
          metadata: {},
        },
        rarity: 'uncommon',
        order: 5,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Star Collector',
        description: 'Earned 250 stars! You\'re collecting stars like a pro!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 250,
          metadata: {},
        },
        rarity: 'rare',
        order: 6,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Diamond Level',
        description: 'Earned 500 stars! You\'ve reached diamond level!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 500,
          metadata: {},
        },
        rarity: 'epic',
        order: 7,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Champion',
        description: 'Earned 1000 stars! You\'re a true champion!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 1000,
          metadata: {},
        },
        rarity: 'epic',
        order: 8,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Mega Star',
        description: 'Earned 2500 stars! You\'re a mega star!',
        category: 'level',
        criteria: {
          type: 'total_stars',
          value: 2500,
          metadata: {},
        },
        rarity: 'legendary',
        order: 9,
        isActive: true,
        createdBy: adminUser._id,
      },

      // ============================================
      // CONTENT-TYPE BADGES - BOOKS
      // ============================================
      {
        name: 'Book Lover',
        description: 'Earned 50 stars from reading books! Keep reading!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 50,
          metadata: { contentType: 'book' },
        },
        rarity: 'uncommon',
        order: 10,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Bookworm',
        description: 'Earned 150 stars from reading books! You\'re a true bookworm!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 150,
          metadata: { contentType: 'book' },
        },
        rarity: 'rare',
        order: 11,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Reading Master',
        description: 'Earned 300 stars from reading books! You\'re a reading master!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 300,
          metadata: { contentType: 'book' },
        },
        rarity: 'epic',
        order: 12,
        isActive: true,
        createdBy: adminUser._id,
      },

      // ============================================
      // CONTENT-TYPE BADGES - MUSIC
      // ============================================
      {
        name: 'Music Star',
        description: 'Earned 20 stars from music activities! Keep making music!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 20,
          metadata: { contentType: 'music' },
        },
        rarity: 'common',
        order: 13,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Music Maestro',
        description: 'Earned 100 stars from music activities! You\'re a music maestro!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 100,
          metadata: { contentType: 'music' },
        },
        rarity: 'rare',
        order: 14,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Rock Star',
        description: 'Earned 250 stars from music activities! You\'re a rock star!',
        category: 'milestone',
        criteria: {
          type: 'custom',
          value: 250,
          metadata: { contentType: 'music' },
        },
        rarity: 'epic',
        order: 15,
        isActive: true,
        createdBy: adminUser._id,
      },

      // ============================================
      // STREAK BADGES
      // ============================================
      {
        name: 'Week Streak',
        description: 'Maintained a 7-day learning streak! Keep it up!',
        category: 'streak',
        criteria: {
          type: 'streak_days',
          value: 7,
          metadata: { checkLongest: false },
        },
        rarity: 'uncommon',
        order: 20,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Month Streak',
        description: 'Maintained a 30-day learning streak! Amazing dedication!',
        category: 'streak',
        criteria: {
          type: 'streak_days',
          value: 30,
          metadata: { checkLongest: false },
        },
        rarity: 'rare',
        order: 21,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Streak Master',
        description: 'Achieved a 100-day learning streak! You\'re a streak master!',
        category: 'streak',
        criteria: {
          type: 'streak_days',
          value: 100,
          metadata: { checkLongest: true },
        },
        rarity: 'epic',
        order: 22,
        isActive: true,
        createdBy: adminUser._id,
      },

      // ============================================
      // COMPLETION BADGES
      // ============================================
      {
        name: 'First Activity',
        description: 'Completed your first activity! Great start!',
        category: 'completion',
        criteria: {
          type: 'activities_completed',
          value: 1,
          metadata: {},
        },
        rarity: 'common',
        order: 30,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Activity Enthusiast',
        description: 'Completed 50 activities! You\'re an activity enthusiast!',
        category: 'completion',
        criteria: {
          type: 'activities_completed',
          value: 50,
          metadata: {},
        },
        rarity: 'uncommon',
        order: 31,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Completion Master',
        description: 'Completed 25 lessons! You\'re a completion master!',
        category: 'completion',
        criteria: {
          type: 'lessons_completed',
          value: 25,
          metadata: {},
        },
        rarity: 'rare',
        order: 32,
        isActive: true,
        createdBy: adminUser._id,
      },
    ];

    // Seed badges using upsert (safe to run multiple times)
    // Note: icon and image are NOT set - frontend handles icons via mapping
    let created = 0;
    let updated = 0;

    for (const badgeData of badges) {
      // Explicitly exclude icon/image for static badges (frontend handles them)
      const { icon, image, ...badgeToSeed } = badgeData;

      const result = await Badge.findOneAndUpdate(
        { name: badgeData.name },
        badgeToSeed,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.isNew) {
        created++;
        console.log(`[BadgeSeeder] ✅ Created badge: ${badgeData.name}`);
      } else {
        updated++;
        console.log(`[BadgeSeeder] 🔄 Updated badge: ${badgeData.name}`);
      }
    }

    console.log(`\n[BadgeSeeder] ✅ Seeding complete!`);
    console.log(`[BadgeSeeder] Created: ${created} badges`);
    console.log(`[BadgeSeeder] Updated: ${updated} badges`);
    console.log(`[BadgeSeeder] Total: ${badges.length} badges`);

    // Verify badges by category
    const levelBadges = await Badge.countDocuments({ category: 'level' });
    const milestoneBadges = await Badge.countDocuments({ category: 'milestone' });
    const streakBadges = await Badge.countDocuments({ category: 'streak' });
    const completionBadges = await Badge.countDocuments({ category: 'completion' });

    console.log(`\n[BadgeSeeder] Badge Summary:`);
    console.log(`  Level badges: ${levelBadges}`);
    console.log(`  Milestone badges: ${milestoneBadges}`);
    console.log(`  Streak badges: ${streakBadges}`);
    console.log(`  Completion badges: ${completionBadges}`);
    console.log(`  Total badges: ${await Badge.countDocuments()}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n[BadgeSeeder] Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('[BadgeSeeder] ❌ Error seeding badges:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeder
seedBadges();

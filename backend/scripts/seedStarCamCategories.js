const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { StarCamCategory } = require('../models');

dotenv.config();

const CATEGORIES = [
  {
    key: 'reading',
    name: 'Reading',
    description: 'Reading-focused missions and objects related to reading activities.',
    sortOrder: 1,
    isActive: true,
    targets: ['book', 'headphones', 'microphone', 'pencil', 'notebook'],
  },
  {
    key: 'recipes',
    name: 'Recipes',
    description: 'Kitchen and cooking missions using safe household objects.',
    sortOrder: 2,
    isActive: true,
    targets: ['spoon', 'plate', 'cup', 'bowl', 'banana'],
  },
  {
    key: 'nature',
    name: 'Nature',
    description: 'Outdoor and environment missions for nature vocabulary.',
    sortOrder: 3,
    isActive: true,
    targets: ['leaf', 'rock', 'flower', 'tree', 'cloud', 'sun'],
  },
  {
    key: 'sing',
    name: 'Sing',
    description: 'Music and singing themed missions.',
    sortOrder: 4,
    isActive: true,
    targets: ['microphone', 'speaker', 'headphones', 'drum', 'guitar'],
  },
];

async function seedStarCamCategories() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const dbName = mongoose.connection.db?.databaseName;
    const collName = StarCamCategory.collection.name;
    console.log(`[StarCamCategorySeeder] MongoDB Connected: ${conn.connection.host}`);
    console.log(`[StarCamCategorySeeder] Database: ${dbName || '(unknown)'}  Collection: ${collName}`);

    let created = 0;
    let updated = 0;

    for (const category of CATEGORIES) {
      const existing = await StarCamCategory.findOne({ key: category.key }).select('_id').lean();
      await StarCamCategory.findOneAndUpdate(
        { key: category.key },
        {
          $set: {
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            targets: category.targets,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (existing) {
        updated += 1;
        console.log(`[StarCamCategorySeeder] Updated: ${category.key}`);
      } else {
        created += 1;
        console.log(`[StarCamCategorySeeder] Created: ${category.key}`);
      }
    }

    const total = await StarCamCategory.countDocuments();
    console.log(`[StarCamCategorySeeder] Done. Created=${created}, Updated=${updated}, Total=${total}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[StarCamCategorySeeder] Failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedStarCamCategories();


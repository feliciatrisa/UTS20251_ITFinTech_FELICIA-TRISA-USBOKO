const { MongoClient } = require('mongodb');

async function fixDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uts20251';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Get current indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the problematic phoneNumber index if it exists
    try {
      await usersCollection.dropIndex('phoneNumber_1');
      console.log('Dropped phoneNumber_1 index');
    } catch (error) {
      console.log('phoneNumber_1 index not found or already dropped');
    }

    // Remove any documents with null phone values
    const deleteResult = await usersCollection.deleteMany({ 
      $or: [
        { phone: null },
        { phone: { $exists: false } },
        { phoneNumber: null },
        { phoneNumber: { $exists: false } }
      ]
    });
    console.log(`Deleted ${deleteResult.deletedCount} documents with null phone values`);

    // Create the correct index for phone field
    await usersCollection.createIndex({ phone: 1 }, { unique: true });
    console.log('Created unique index for phone field');

    // Show final indexes
    const finalIndexes = await usersCollection.indexes();
    console.log('Final indexes:', finalIndexes);

  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

fixDatabase();
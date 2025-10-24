const { MongoClient } = require('mongodb');

async function cleanDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uts20251';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Show current state
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Current total users: ${totalUsers}`);

    // Get current indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop all indexes except _id
    console.log('\nDropping all custom indexes...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await usersCollection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`Could not drop index ${index.name}:`, error.message);
        }
      }
    }

    // Delete all users
    console.log('\nDeleting all users...');
    const deleteResult = await usersCollection.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} users`);

    // Create fresh index for phone field
    console.log('\nCreating fresh phone index...');
    await usersCollection.createIndex({ phone: 1 }, { unique: true });
    console.log('Created unique index for phone field');

    // Verify final state
    const finalUserCount = await usersCollection.countDocuments();
    const finalIndexes = await usersCollection.indexes();
    
    console.log('\nFinal state:');
    console.log(`Total users: ${finalUserCount}`);
    console.log('Final indexes:');
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\nDatabase cleaned successfully!');

  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

cleanDatabase();
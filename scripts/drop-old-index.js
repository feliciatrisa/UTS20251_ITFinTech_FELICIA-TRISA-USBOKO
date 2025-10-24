const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function dropOldIndex() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    console.log('Please make sure .env.local file exists with MONGODB_URI');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Show current indexes
    console.log('Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop the problematic phoneNumber_1 index
    try {
      await usersCollection.dropIndex('phoneNumber_1');
      console.log('\n✅ Successfully dropped phoneNumber_1 index');
    } catch (error) {
      console.log('\n❌ Could not drop phoneNumber_1 index:', error.message);
    }

    // Ensure we have the correct phone index
    try {
      await usersCollection.createIndex({ phone: 1 }, { unique: true });
      console.log('✅ Created/ensured phone index exists');
    } catch (error) {
      console.log('❌ Could not create phone index:', error.message);
    }

    // Show final indexes
    console.log('\nFinal indexes:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 Index fix completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

dropOldIndex();
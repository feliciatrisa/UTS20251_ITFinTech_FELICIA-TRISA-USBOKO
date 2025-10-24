const { MongoClient } = require('mongodb');

async function checkUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uts20251';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Count total users
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    // Get all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log('\nAll users:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Phone: "${user.phone}" (type: ${typeof user.phone})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isVerified}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

    // Check for users with null or undefined phone
    const nullPhoneUsers = await usersCollection.find({
      $or: [
        { phone: null },
        { phone: { $exists: false } },
        { phone: "" },
        { phoneNumber: { $exists: true } }
      ]
    }).toArray();

    if (nullPhoneUsers.length > 0) {
      console.log('\nUsers with problematic phone values:');
      nullPhoneUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`);
        console.log(`   Phone: "${user.phone}"`);
        console.log(`   PhoneNumber: "${user.phoneNumber}"`);
        console.log('---');
      });
    }

    // Get current indexes
    const indexes = await usersCollection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

checkUsers();
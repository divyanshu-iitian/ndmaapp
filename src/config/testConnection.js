const { testConnection } = require('./database');

// Test MongoDB connection
const runDatabaseTest = async () => {
  console.log('Testing MongoDB connection...');
  
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('✅ Database connection test successful!');
    } else {
      console.log('❌ Database connection test failed!');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  runDatabaseTest();
}

module.exports = { runDatabaseTest };
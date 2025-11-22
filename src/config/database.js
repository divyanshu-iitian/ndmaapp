const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection configuration
const MONGODB_CONFIG = {
  uri: "mongodb+srv://divyanshumishra0208_db_user:u9lLVpstjHXNb5XC@cluster0.25elnbq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  options: {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // SSL configuration to handle connection issues
    ssl: true,
    sslValidate: false,
    tlsInsecure: true,
    // Connection timeout settings
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  }
};

// Database and Collection names
const DATABASE_NAME = "ndma_training";
const COLLECTIONS = {
  TRAINERS: "trainers",
  CENTRAL_AUTHORITIES: "central_authorities",
  TRAINING_SESSIONS: "training_sessions",
  PARTICIPANTS: "participants"
};

let client = null;

// Initialize MongoDB connection
const connectToDatabase = async () => {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
      await client.connect();
      console.log("Connected to MongoDB successfully!");
    }
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

// Get database instance
const getDatabase = async () => {
  const mongoClient = await connectToDatabase();
  return mongoClient.db(DATABASE_NAME);
};

// Get specific collection
const getCollection = async (collectionName) => {
  const database = await getDatabase();
  return database.collection(collectionName);
};

// Close database connection
const closeDatabaseConnection = async () => {
  if (client) {
    await client.close();
    client = null;
    console.log("MongoDB connection closed");
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const mongoClient = await connectToDatabase();
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    return false;
  }
};

// User registration functions
const registerTrainer = async (trainerData) => {
  try {
    const collection = await getCollection(COLLECTIONS.TRAINERS);
    
    // Check if user already exists
    const existingTrainer = await collection.findOne({ email: trainerData.email });
    if (existingTrainer) {
      throw new Error('Trainer with this email already exists');
    }

    // Add timestamp and default values
    const trainer = {
      ...trainerData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      verificationStatus: 'pending'
    };

    const result = await collection.insertOne(trainer);
    console.log('Trainer registered successfully:', result.insertedId);
    return { success: true, id: result.insertedId };
  } catch (error) {
    console.error('Error registering trainer:', error);
    throw error;
  }
};

const registerCentralAuthority = async (authorityData) => {
  try {
    const collection = await getCollection(COLLECTIONS.CENTRAL_AUTHORITIES);
    
    // Check if user already exists
    const existingAuthority = await collection.findOne({ officialEmail: authorityData.officialEmail });
    if (existingAuthority) {
      throw new Error('Authority with this email already exists');
    }

    // Add timestamp and default values
    const authority = {
      ...authorityData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false, // Requires approval
      approvalStatus: 'pending',
      verificationStatus: 'pending'
    };

    const result = await collection.insertOne(authority);
    console.log('Central Authority registered successfully:', result.insertedId);
    return { success: true, id: result.insertedId };
  } catch (error) {
    console.error('Error registering central authority:', error);
    throw error;
  }
};

// User authentication functions
const authenticateTrainer = async (email, password) => {
  try {
    const collection = await getCollection(COLLECTIONS.TRAINERS);
    const trainer = await collection.findOne({ 
      email: email, 
      password: password, // In production, use hashed passwords
      isActive: true 
    });
    
    if (trainer) {
      // Update last login
      await collection.updateOne(
        { _id: trainer._id },
        { $set: { lastLogin: new Date() } }
      );
      
      // Remove password from returned data
      delete trainer.password;
      return { success: true, user: trainer };
    }
    
    return { success: false, message: 'Invalid credentials' };
  } catch (error) {
    console.error('Error authenticating trainer:', error);
    throw error;
  }
};

const authenticateCentralAuthority = async (email, password) => {
  try {
    const collection = await getCollection(COLLECTIONS.CENTRAL_AUTHORITIES);
    const authority = await collection.findOne({ 
      officialEmail: email, 
      password: password, // In production, use hashed passwords
      isActive: true,
      approvalStatus: 'approved'
    });
    
    if (authority) {
      // Update last login
      await collection.updateOne(
        { _id: authority._id },
        { $set: { lastLogin: new Date() } }
      );
      
      // Remove password from returned data
      delete authority.password;
      return { success: true, user: authority };
    }
    
    return { success: false, message: 'Invalid credentials or account not approved' };
  } catch (error) {
    console.error('Error authenticating central authority:', error);
    throw error;
  }
};

// Export all functions and constants
module.exports = {
  MONGODB_CONFIG,
  DATABASE_NAME,
  COLLECTIONS,
  connectToDatabase,
  getDatabase,
  getCollection,
  closeDatabaseConnection,
  testConnection,
  registerTrainer,
  registerCentralAuthority,
  authenticateTrainer,
  authenticateCentralAuthority
};
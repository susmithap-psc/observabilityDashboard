import mongoose from 'mongoose';

export let dbConnected = false;

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️  MONGODB_URI not set — running without database');
      return;
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    dbConnected = true;
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB connection failed: ${error.message}`);
    console.warn('⚠️  Server will start without database — API calls requiring DB will fail');
  }
};

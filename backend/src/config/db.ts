import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (retries = 3): Promise<typeof mongoose> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(ENV.MONGODB_URI, {
        autoIndex: true,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      if (attempt === retries) {
        console.error('[Database] MongoDB connection error:', error);
        process.exit(1);
      }
      console.warn(`[Database] Connection attempt ${attempt} failed. Retrying in 2 seconds...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  process.exit(1);
};

export const closeDB = async (): Promise<void> => {
  await mongoose.connection.close();
  console.log('[Database] MongoDB connection closed');
};


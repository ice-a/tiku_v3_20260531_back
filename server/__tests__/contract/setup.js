import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer = null;
let connected = false;

export async function startTestEnv() {
  if (mongoServer) return;
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-contract';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-contract';
  process.env.MINIPROGRAM_RATE_LIMIT = process.env.MINIPROGRAM_RATE_LIMIT || '1000';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
    connected = true;
  }
}

export async function stopTestEnv() {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

export async function clearTestData() {
  const collections = mongoose.connection.collections || {};
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

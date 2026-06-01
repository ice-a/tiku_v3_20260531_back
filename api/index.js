import app from '../server/app.js';
import mongoose from 'mongoose';

let connectionPromise;

function ensureDBConnection() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiku')
      .then(() => {
        console.log('MongoDB connected');
      })
      .catch((error) => {
        connectionPromise = null;
        console.error('MongoDB connection error:', error);
        throw error;
      });
  }

  return connectionPromise;
}

export default async function handler(req, res) {
  const pathname = (req.url || '').split('?')[0];

  if (pathname === '/' || pathname === '') {
    return res.json({
      status: 'ok',
      service: 'tiku-api',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'OPTIONS' && pathname !== '/api/health') {
    await ensureDBConnection();
  }

  return app(req, res);
}

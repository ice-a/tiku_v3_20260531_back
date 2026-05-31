import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 路由导入
import authRoutes from '../server/routes/auth.js';
import questionRoutes from '../server/routes/questions.js';
import navigationRoutes from '../server/routes/navigations.js';
import affiliateRoutes from '../server/routes/affiliates.js';
import userRoutes from '../server/routes/users.js';
import careerRoutes from '../server/routes/career.js';
import toolRoutes from '../server/routes/tools.js';
import adminRoutes from '../server/routes/admin.js';
import errorHandler from '../server/middleware/errorHandler.js';
import logger from '../server/middleware/logger.js';

dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(logger);

// 数据库连接（缓存连接）
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiku');
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/navigations', navigationRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/admin', adminRoutes);

// 错误处理
app.use(errorHandler);

// Vercel Serverless Function 导出
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}

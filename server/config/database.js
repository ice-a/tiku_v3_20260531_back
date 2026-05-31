import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri);
    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB 连接失败: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;

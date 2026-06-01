import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';

const app = express();

// 安全头
app.use(helmet());

// CORS 白名单。开发环境同时兼容 localhost 和 127.0.0.1，避免前端 dev server
// 绑定地址变化后被误拦截。
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://tiku.020417.xyz',
      'https://020417.xyz',
    ];

const devHostnames = new Set(['localhost', '127.0.0.1', '::1']);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  if (process.env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origin);
      return url.port === '5173' && devHostnames.has(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth 限流：登录/注册/刷新 token
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '请求过于频繁，请稍后再试' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// 路由
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import navigationRoutes from './routes/navigations.js';
import affiliateRoutes from './routes/affiliates.js';
import userRoutes from './routes/users.js';
import careerRoutes from './routes/career.js';
import toolRoutes from './routes/tools.js';
import adminRoutes from './routes/admin.js';
import miniprogramRoutes from './routes/miniprogram.js';

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/navigations', navigationRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mp', miniprogramRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
export { config };

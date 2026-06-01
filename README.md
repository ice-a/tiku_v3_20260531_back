# 题库系统 - 后端

> 🔗 **前端仓库**：[ice-a/tiku_v3_20260531_front](https://github.com/ice-a/tiku_v3_20260531_front)

基于 Express.js + MongoDB 的 REST API 服务。

## Mock 数据

运行 `npm run seed` 初始化测试数据。

### 测试账号

| 用户名 | 密码 | 角色 | 昵称 | 说明 |
|--------|------|------|------|------|
| `admin` | `admin123` | admin | 超级管理员 | 系统管理、内容审核、用户管理 |
| `admin_li` | `admin123` | admin | 李管理 | 题目质量管理 |
| `zhangsan` | `test123` | user | 张三 | 前端工程师，3年 React 经验 |
| `lisi` | `test123` | user | 李四 | 计算机专业大学生，准备秋招 |
| `wangwu` | `test123` | user | 王五 | 全栈开发者，Vue + Node.js |
| `zhaoliu` | `test123` | user | 赵六 | 转行前端半年，学习中 |
| `sunqi` | `test123` | user | 孙七 | 高级前端，5年经验，熟悉多框架 |
| `zhouba` | `test123` | user | 周八 | 前端架构师，关注性能优化 |
| `wujiu` | `test123` | user | 吴九 | 自由职业者，接外包项目 |
| `zhengshi` | `test123` | user | 郑十 | 后端转前端，系统学习 CSS |

### Mock 数据统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 用户 | 10 | 2 个管理员 + 8 个普通用户 |
| 题目 | 50 | 覆盖 JavaScript、CSS、Vue、React、TypeScript、网络、工程化、浏览器 8 个分类 |
| 导航 | 15 | 文档、工具、社区、框架、设计等分类 |
| 联盟链接 | 8 | 云服务、部署、BaaS、AI 工具等分类 |
| 练习记录 | ~80 | 每个用户 8-15 条随机练习记录 |
| 反馈 | 6 | 错误报告 + 建议，含 pending/resolved 状态 |
| 收藏 | ~20 | 题目、导航、联盟混合收藏 |
| 对话历史 | 3 | 面试辅导、简历优化、职业规划 |

## 技术栈

- Express.js 4
- MongoDB + Mongoose 8
- JWT 认证（access + refresh token）
- Sharp 图片处理
- Multer 文件上传
- Nodemailer 邮件
- Prettier 代码格式化
- Vitest 测试框架

## 环境变量

复制 `.env.example` 为 `.env`，填写以下配置：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MONGODB_URI` | 是 | MongoDB 连接字符串 |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `JWT_REFRESH_SECRET` | 是 | JWT 刷新密钥 |
| `PORT` | 否 | 服务器端口，默认 3000 |
| `CORS_ORIGIN` | 否 | 允许的前端源（逗号分隔），如 `https://tiku.020417.xyz,https://020417.xyz` |
| `MINIPROGRAM_RATE_LIMIT` | 否 | 小程序专用接口每分钟请求上限，默认 90 |
| `GITHUB_CLIENT_ID` | Web GitHub 登录 | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Web GitHub 登录 | GitHub OAuth App Client Secret |
| `SMTP_HOST` | 否 | SMTP 服务器 |
| `SMTP_PORT` | 否 | SMTP 端口 |
| `SMTP_USER` | 否 | SMTP 用户名 |
| `SMTP_PASS` | 否 | SMTP 密码 |
| `SMTP_FROM` | 否 | 发件人，建议格式：`题库系统 <your_email@example.com>`。未配置时默认使用 `SMTP_USER` |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（自动重启）
npm run dev

# 启动生产服务器
npm start
```

API 地址：http://localhost:3000

健康检查：http://localhost:3000/api/health

## 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch
```

测试覆盖：
- `services/__tests__/tools.test.js` — 工具函数（45 个测试）
- `services/__tests__/aiClient.test.js` — SSRF 防护（18 个测试）

## 安全中间件

- **Helmet** — 自动设置 HTTP 安全头（X-Content-Type-Options, HSTS, X-Frame-Options 等）
- **express-rate-limit** — 登录/注册/刷新接口限流（15 分钟窗口，每 IP 最多 20 次）
- **CORS** — 白名单域名，支持 credentials

## API 路由

| 路径 | 说明 |
|------|------|
| `/api/auth` | 认证（注册、登录、刷新 token、个人资料） |
| `/api/questions` | 题目管理（CRUD、练习、AI 评分、分享、反馈） |
| `/api/navigations` | 网址导航管理 |
| `/api/affiliates` | AFF 链接管理 |
| `/api/users` | 用户信息、收藏、通知 |
| `/api/career` | 面试辅导（AI 对话） |
| `/api/tools` | 在线工具（图片、文本、代码、加密等） |
| `/api/admin` | 管理员功能 |
| `/api/mp` | 微信小程序专用公开接口，带客户端校验、限流和字段裁剪 |
| `/api/hitokoto` | 一言接口代理，供网页展示和邮件模板复用 |
| `/api/health` | 健康检查 |

## 项目结构

```
backend/
├── app.js                  # Express 入口
├── package.json
├── vitest.config.js        # 测试配置
├── .env.example            # 环境变量示例
├── api/
│   └── index.js            # Vercel Serverless Function 入口
└── server/
    ├── config/             # 数据库和应用配置
    ├── models/             # Mongoose 数据模型
    │   ├── User.js
    │   ├── Question.js
    │   ├── Navigation.js
    │   ├── Affiliate.js
    │   ├── Favorite.js
    │   ├── Feedback.js
    │   ├── PracticeRecord.js
    │   └── ChatHistory.js
    ├── middleware/          # Express 中间件
    ├── routes/             # 路由定义
    ├── controllers/        # 控制器
    ├── services/           # 业务逻辑
    │   └── __tests__/      # 服务层测试
    └── utils/              # 工具函数
```

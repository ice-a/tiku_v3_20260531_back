import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import User from '../server/models/User.js';
import Question from '../server/models/Question.js';
import Navigation from '../server/models/Navigation.js';
import Affiliate from '../server/models/Affiliate.js';
import PracticeRecord from '../server/models/PracticeRecord.js';
import Feedback from '../server/models/Feedback.js';
import Favorite from '../server/models/Favorite.js';
import ChatHistory from '../server/models/ChatHistory.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://192.168.28.9:27017/tiku';

// ========== Mock 用户数据 ==========
const users = [
  // 管理员
  { username: 'admin', email: 'admin@tiku.com', password: 'admin123', role: 'admin', nickname: '超级管理员', bio: '系统管理员，负责平台运营与内容审核。' },
  { username: 'admin_li', email: 'admin_li@tiku.com', password: 'admin123', role: 'admin', nickname: '李管理', bio: '后台管理员，专注题目质量管理。' },

  // 普通用户 - 不同活跃度
  { username: 'zhangsan', email: 'zhangsan@test.com', password: 'test123', role: 'user', nickname: '张三', phone: '13800001111', bio: '前端开发工程师，3年经验，主攻 React 技术栈。' },
  { username: 'lisi', email: 'lisi@test.com', password: 'test123', role: 'user', nickname: '李四', phone: '13800002222', bio: '在校大学生，计算机科学专业，正在准备秋招。' },
  { username: 'wangwu', email: 'wangwu@test.com', password: 'test123', role: 'user', nickname: '王五', bio: '全栈开发者，Vue + Node.js 技术栈。' },
  { username: 'zhaoliu', email: 'zhaoliu@test.com', password: 'test123', role: 'user', nickname: '赵六', phone: '13800003333', bio: '转行前端半年，努力学习中。' },
  { username: 'sunqi', email: 'sunqi@test.com', password: 'test123', role: 'user', nickname: '孙七', bio: '高级前端工程师，5年经验，熟悉 React/Vue/Angular。' },
  { username: 'zhouba', email: 'zhouba@test.com', password: 'test123', role: 'user', nickname: '周八', phone: '13800004444', bio: '前端架构师，关注性能优化与工程化。' },
  { username: 'wujiu', email: 'wujiu@test.com', password: 'test123', role: 'user', nickname: '吴九', bio: '自由职业者，接外包项目。' },
  { username: 'zhengshi', email: 'zhengshi@test.com', password: 'test123', role: 'user', nickname: '郑十', phone: '13800005555', bio: '后端转前端，正在系统学习 CSS。' },
];

// ========== Mock 题目数据 ==========
const questions = [
  // === JavaScript 基础 (10) ===
  { text: 'JavaScript 中 `typeof null` 的返回值是什么？', answer: '"object"。这是 JavaScript 的一个历史遗留 bug，null 被错误地判断为对象类型。', category: 'JavaScript', difficulty: 'easy', tags: ['基础', '类型'], status: 'approved' },
  { text: '解释 JavaScript 中的闭包（Closure）是什么？', answer: '闭包是指函数能够访问其词法作用域中变量的能力，即使该函数在其作用域之外执行。常见用途：数据私有化、函数工厂、回调。', category: 'JavaScript', difficulty: 'medium', tags: ['闭包', '作用域'], status: 'approved' },
  { text: '`var`、`let` 和 `const` 的区别是什么？', answer: 'var 有变量提升且是函数作用域；let 有块级作用域，不可重复声明；const 有块级作用域，声明时必须初始化，不可重新赋值（但对象内部属性可修改）。', category: 'JavaScript', difficulty: 'easy', tags: ['变量', 'ES6'], status: 'approved' },
  { text: '什么是 Promise？请解释其三种状态。', answer: 'Promise 是异步编程的解决方案。三种状态：pending（进行中）、fulfilled（已成功）、rejected（已失败）。状态一旦改变就不可逆转。', category: 'JavaScript', difficulty: 'medium', tags: ['异步', 'Promise'], status: 'approved' },
  { text: '解释事件循环（Event Loop）机制', answer: '事件循环负责执行代码、收集和处理事件、执行队列中的任务。宏任务进入任务队列，微任务进入微任务队列，微任务优先执行。每轮宏任务执行完后会清空所有微任务。', category: 'JavaScript', difficulty: 'hard', tags: ['异步', '事件循环'], status: 'approved' },
  { text: '什么是原型链（Prototype Chain）？', answer: '每个对象都有一个 __proto__ 指向其构造函数的 prototype。当访问对象属性时，会沿原型链向上查找，直到找到或到达 null。这是 JavaScript 实现继承的机制。', category: 'JavaScript', difficulty: 'medium', tags: ['原型', '继承'], status: 'approved' },
  { text: '`==` 和 `===` 的区别？', answer: '== 会进行类型转换后比较（宽松相等），=== 不做类型转换（严格相等）。推荐始终使用 === 避免隐式转换带来的意外。', category: 'JavaScript', difficulty: 'easy', tags: ['基础', '比较'], status: 'approved' },
  { text: '什么是防抖（Debounce）和节流（Throttle）？', answer: '防抖：事件触发后延迟执行，若在延迟期间再次触发则重新计时。节流：规定时间内只执行一次。防抖适合搜索输入，节流适合滚动事件。', category: 'JavaScript', difficulty: 'medium', tags: ['性能', '优化'], status: 'approved' },
  { text: '解释 `this` 关键字在不同场景下的指向', answer: '全局上下文指向 window；对象方法指向该对象；构造函数指向新实例；箭头函数继承外层 this；call/apply/bind 可显式绑定。', category: 'JavaScript', difficulty: 'medium', tags: ['this', '作用域'], status: 'approved' },
  { text: '什么是 WebAssembly？它和 JavaScript 的关系是什么？', answer: 'WebAssembly 是一种低级字节码格式，可在浏览器中以接近原生速度运行。它不替代 JS，而是作为补充，适合计算密集型任务（如游戏、视频编辑）。', category: 'JavaScript', difficulty: 'hard', tags: ['WASM', '性能'], status: 'pending' },

  // === CSS (8) ===
  { text: 'CSS 中 `position: sticky` 如何工作？', answer: '元素在跨越特定阈值前为相对定位，之后为固定定位。需要指定 top/bottom/left/right 之一，且父容器不能设置 overflow: hidden。', category: 'CSS', difficulty: 'medium', tags: ['定位', '布局'], status: 'approved' },
  { text: 'Flexbox 和 Grid 的区别是什么？', answer: 'Flexbox 是一维布局（行或列），适合组件内布局；Grid 是二维布局（行和列），适合整体页面布局。两者可组合使用。', category: 'CSS', difficulty: 'medium', tags: ['布局', 'Flexbox', 'Grid'], status: 'approved' },
  { text: '什么是 BFC（块级格式化上下文）？', answer: 'BFC 是一个独立的渲染区域，内部元素的布局不会影响外部。触发条件：overflow 不为 visible、float、position 为 absolute/fixed、display 为 inline-block 等。', category: 'CSS', difficulty: 'hard', tags: ['BFC', '布局'], status: 'approved' },
  { text: 'CSS 选择器优先级如何计算？', answer: '优先级从高到低：!important > 内联样式 > ID 选择器 > 类/伪类/属性选择器 > 元素/伪元素选择器 > 通配符。相同优先级后定义的覆盖先定义的。', category: 'CSS', difficulty: 'easy', tags: ['选择器', '优先级'], status: 'approved' },
  { text: '什么是 CSS 变量（Custom Properties）？如何使用？', answer: '使用 -- 前缀定义，如 --main-color: red；通过 var() 使用，如 color: var(--main-color)。支持级联、继承，可通过 JS 动态修改。', category: 'CSS', difficulty: 'easy', tags: ['变量', 'CSS3'], status: 'approved' },
  { text: '如何实现 CSS 水平和垂直居中？', answer: '常见方案：1) flex: justify-content + align-items: center; 2) grid: place-items: center; 3) position + transform; 4) margin: auto（需定宽高）。', category: 'CSS', difficulty: 'easy', tags: ['居中', '布局'], status: 'approved' },
  { text: 'CSS 容器查询（Container Queries）是什么？', answer: '允许根据父容器大小而非视口大小来应用样式，是响应式设计的新范式。使用 @container 定义，需先用 container-type 声明容器。', category: 'CSS', difficulty: 'medium', tags: ['响应式', '新特性'], status: 'pending' },
  { text: '解释 CSS 的层叠上下文（Stacking Context）', answer: '层叠上下文决定了元素在 Z 轴上的显示顺序。根元素、position: relative/absolute + z-index、opacity < 1、transform 等都会创建新的层叠上下文。', category: 'CSS', difficulty: 'hard', tags: ['层叠', 'z-index'], status: 'approved' },

  // === Vue (8) ===
  { text: 'Vue 中 `computed` 和 `watch` 的区别？', answer: 'computed 有缓存，依赖不变则不重新计算，适合派生状态；watch 适合执行副作用，可获取旧值和新值，支持深度监听。', category: 'Vue', difficulty: 'easy', tags: ['响应式', '计算属性'], status: 'approved' },
  { text: 'Vue 3 的 Composition API 相比 Options API 有什么优势？', answer: '更好的逻辑复用（composables）、更灵活的代码组织、更好的 TypeScript 推导、更小的打包体积（tree-shaking）。', category: 'Vue', difficulty: 'medium', tags: ['Vue3', 'Composition'], status: 'approved' },
  { text: '解释 Vue 的虚拟 DOM 和 Diff 算法', answer: '虚拟 DOM 是真实 DOM 的 JS 对象表示。Diff 算法通过同层比较、key 复用、双端比较等策略最小化 DOM 操作。Vue 3 引入了静态树提升和 PatchFlag 优化。', category: 'Vue', difficulty: 'hard', tags: ['虚拟DOM', '性能'], status: 'approved' },
  { text: 'Vue 的响应式原理是什么？', answer: 'Vue 2 使用 Object.defineProperty（无法检测新增/删除属性）；Vue 3 使用 Proxy（可检测所有变化），配合 effect/track/trigger 实现依赖收集和触发更新。', category: 'Vue', difficulty: 'medium', tags: ['响应式', '原理'], status: 'approved' },
  { text: 'Vue Router 的导航守卫有哪些？', answer: '全局守卫：beforeEach、beforeResolve、afterEach；路由独享：beforeEnter；组件内：beforeRouteEnter、beforeRouteUpdate、beforeRouteLeave。', category: 'Vue', difficulty: 'medium', tags: ['路由', '导航守卫'], status: 'approved' },
  { text: 'Vuex 和 Pinia 的区别？', answer: 'Pinia 是 Vue 官方推荐的状态管理库，支持 Composition API，无 mutations（直接修改 state），更好的 TypeScript 支持，更轻量。Vuex 有严格的 state/mutations/actions 分层。', category: 'Vue', difficulty: 'medium', tags: ['状态管理', 'Pinia'], status: 'approved' },
  { text: 'Vue 组件间通信有哪些方式？', answer: 'props/emit（父子）、provide/inject（跨层级）、EventBus（已废弃）、ref/defineExpose（父调子）、Vuex/Pinia（全局状态）、attrs（透传属性）。', category: 'Vue', difficulty: 'easy', tags: ['组件', '通信'], status: 'approved' },
  { text: '什么是 Vue 的 nextTick？使用场景？', answer: 'nextTick 在 DOM 更新完成后执行回调。使用场景：修改数据后需要立即操作更新后的 DOM，如获取元素尺寸、聚焦输入框。', category: 'Vue', difficulty: 'easy', tags: ['DOM', '异步'], status: 'approved' },

  // === React (6) ===
  { text: 'React 中 useEffect 的依赖数组为空 `[]` 时何时执行？', answer: '仅在组件挂载时执行一次，相当于 componentDidMount。返回的清理函数在组件卸载时执行。', category: 'React', difficulty: 'easy', tags: ['Hooks', '生命周期'], status: 'approved' },
  { text: '什么是 React 的 Fiber 架构？', answer: 'Fiber 是 React 16 引入的协调引擎，将渲染工作拆分为可中断的小单元，实现时间切片和优先级调度，避免长时间阻塞主线程。', category: 'React', difficulty: 'hard', tags: ['架构', '性能'], status: 'approved' },
  { text: 'useCallback 和 useMemo 的区别？', answer: 'useCallback 缓存函数引用，useMemo 缓存计算结果。useCallback(fn, deps) 等价于 useMemo(() => fn, deps)。都用于避免子组件不必要的重渲染。', category: 'React', difficulty: 'medium', tags: ['Hooks', '性能'], status: 'approved' },
  { text: 'React 中 key 的作用是什么？', answer: 'key 帮助 React 识别哪些元素改变了（增删改）。使用稳定唯一的 key 可以最大限度地复用 DOM，提升渲染性能。不建议用数组索引作为 key。', category: 'React', difficulty: 'easy', tags: ['虚拟DOM', '渲染'], status: 'approved' },
  { text: '什么是 React 的 Context？何时使用？', answer: 'Context 提供了跨组件传递数据的方式，避免 props 层层传递（prop drilling）。适合全局数据如主题、语言、用户信息。不宜替代所有 props。', category: 'React', difficulty: 'medium', tags: ['Context', '状态管理'], status: 'approved' },
  { text: 'React Server Components 是什么？', answer: 'RSC 在服务端渲染组件，不发送组件 JS 到客户端，减少包体积。可直接访问数据库/文件系统。与 Client Components 配合使用，标记 "use client"。', category: 'React', difficulty: 'hard', tags: ['RSC', 'Next.js'], status: 'approved' },

  // === TypeScript (5) ===
  { text: 'TypeScript 中 `interface` 和 `type` 的区别？', answer: 'interface 可声明合并（同名自动合并），支持 extends 继承；type 可定义联合类型、交叉类型、映射类型等更复杂的类型。对象类型优先用 interface。', category: 'TypeScript', difficulty: 'medium', tags: ['类型', '接口'], status: 'approved' },
  { text: '什么是泛型（Generics）？举个例子。', answer: '泛型允许在定义函数/接口时不指定具体类型，使用时再确定。如 function identity<T>(arg: T): T { return arg; }，调用时 T 被推导为实际类型。', category: 'TypeScript', difficulty: 'medium', tags: ['泛型', '类型'], status: 'approved' },
  { text: '`any`、`unknown` 和 `never` 的区别？', answer: 'any 绕过类型检查；unknown 是类型安全的 any，使用前必须收窄类型；never 表示永不出现的类型（如抛异常的函数、不可能的交叉类型）。', category: 'TypeScript', difficulty: 'easy', tags: ['基础', '类型'], status: 'approved' },
  { text: '什么是条件类型（Conditional Types）？', answer: '语法：T extends U ? X : Y。根据类型关系选择结果类型。内置工具类型如 Exclude、Extract、ReturnType 都基于条件类型实现。', category: 'TypeScript', difficulty: 'hard', tags: ['高级类型', '条件'], status: 'approved' },
  { text: 'TypeScript 中如何实现类型守卫（Type Guard）？', answer: '1) typeof/instanceof 检查；2) in 操作符；3) 自定义类型谓词：function isFish(pet: Fish | Bird): pet is Fish；4) 使用 is 关键字。', category: 'TypeScript', difficulty: 'medium', tags: ['类型守卫', '收窄'], status: 'approved' },

  // === 网络 (5) ===
  { text: 'HTTP 和 HTTPS 的区别？', answer: 'HTTPS = HTTP + SSL/TLS 加密。HTTPS 使用 443 端口（HTTP 用 80），数据加密传输，需要 CA 证书，安全性更高但有性能开销。', category: '网络', difficulty: 'easy', tags: ['HTTP', '安全'], status: 'approved' },
  { text: 'TCP 三次握手的过程？', answer: '1) 客户端发 SYN；2) 服务端回 SYN+ACK；3) 客户端发 ACK。确保双方都能发送和接收数据。四次挥手：FIN→ACK→FIN→ACK。', category: '网络', difficulty: 'medium', tags: ['TCP', '连接'], status: 'approved' },
  { text: '什么是跨域？如何解决？', answer: '浏览器同源策略限制不同源的请求。解决方案：CORS（服务端设置 Access-Control-Allow-Origin）、代理服务器、JSONP（仅 GET）、WebSocket。', category: '网络', difficulty: 'easy', tags: ['跨域', 'CORS'], status: 'approved' },
  { text: 'HTTP/2 相比 HTTP/1.1 有哪些改进？', answer: '多路复用（一个连接并行多个请求）、头部压缩（HPACK）、服务端推送、二进制分帧。解决了 HTTP/1.1 的队头阻塞问题。', category: '网络', difficulty: 'medium', tags: ['HTTP2', '性能'], status: 'approved' },
  { text: '什么是 CDN？工作原理是什么？', answer: 'CDN（内容分发网络）通过全球分布的边缘节点缓存内容。用户请求被路由到最近的节点，减少延迟。通过 DNS 智能解析实现调度。', category: '网络', difficulty: 'easy', tags: ['CDN', '性能'], status: 'approved' },

  // === 工程化 (5) ===
  { text: 'Webpack 和 Vite 的核心区别？', answer: 'Webpack 基于 bundle，开发时需打包所有模块；Vite 开发模式基于浏览器原生 ESM，按需编译，冷启动极快。生产构建 Vite 使用 Rollup。', category: '工程化', difficulty: 'medium', tags: ['构建', 'Vite'], status: 'approved' },
  { text: '什么是 Tree Shaking？原理是什么？', answer: 'Tree Shaking 移除未使用的代码（dead code elimination）。基于 ES Module 的静态分析，打包时标记未引用的导出，压缩时删除。需确保使用 ESM 语法。', category: '工程化', difficulty: 'medium', tags: ['优化', '打包'], status: 'approved' },
  { text: '什么是 monorepo？常用工具有哪些？', answer: 'monorepo 是将多个项目放在一个仓库中的管理方式。工具：pnpm workspace、Turborepo、Nx、Lerna。优点：代码共享、统一版本、原子提交。', category: '工程化', difficulty: 'medium', tags: ['架构', '工具'], status: 'approved' },
  { text: 'Git rebase 和 merge 的区别？', answer: 'merge 保留分支历史，创建合并提交；rebase 将提交线性化，历史更清晰但改写了提交历史。公共分支用 merge，个人分支可用 rebase。', category: '工程化', difficulty: 'easy', tags: ['Git', '版本控制'], status: 'approved' },
  { text: '什么是 CI/CD？前端项目如何配置？', answer: 'CI：代码提交后自动构建+测试；CD：测试通过后自动部署。前端常用 GitHub Actions，配置 lint→test→build→deploy 流水线。', category: '工程化', difficulty: 'easy', tags: ['CI/CD', '自动化'], status: 'approved' },

  // === 浏览器 (3) ===
  { text: '浏览器渲染页面的过程？', answer: '1) 解析 HTML 构建 DOM；2) 解析 CSS 构建 CSSOM；3) 合并为渲染树；4) 布局（计算位置大小）；5) 绘制（像素化）；6) 合成（GPU 合成图层）。', category: '浏览器', difficulty: 'medium', tags: ['渲染', '性能'], status: 'approved' },
  { text: '什么是重排（Reflow）和重绘（Repaint）？', answer: '重排：元素几何属性变化导致重新布局（如宽高、位置）。重绘：外观变化但不影响布局（如颜色、背景）。重排一定触发重绘，重绘不一定触发重排。', category: '浏览器', difficulty: 'medium', tags: ['性能', 'DOM'], status: 'approved' },
  { text: 'localStorage、sessionStorage 和 Cookie 的区别？', answer: 'localStorage 永久存储（5MB）；sessionStorage 会话级（5MB）；Cookie 随请求发送（4KB），可设过期时间、httpOnly、secure。前两者仅前端可访问。', category: '浏览器', difficulty: 'easy', tags: ['存储', 'API'], status: 'approved' },
];

// ========== Mock 导航数据 ==========
const navigations = [
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: '📚', category: '文档', tags: ['前端', '参考'] },
  { name: 'Can I Use', url: 'https://caniuse.com', icon: '🔍', category: '工具', tags: ['兼容性', '查询'] },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '💬', category: '社区', tags: ['问答', '编程'] },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', category: '工具', tags: ['代码', '版本控制'] },
  { name: 'NPM', url: 'https://www.npmjs.com', icon: '📦', category: '工具', tags: ['包管理', 'Node'] },
  { name: 'Vue.js 官方文档', url: 'https://vuejs.org', icon: '💚', category: '文档', tags: ['Vue', '前端框架'] },
  { name: 'React 官方文档', url: 'https://react.dev', icon: '⚛️', category: '文档', tags: ['React', '前端框架'] },
  { name: 'TypeScript 官方文档', url: 'https://www.typescriptlang.org', icon: '🔷', category: '文档', tags: ['TypeScript', '类型'] },
  { name: 'Vite', url: 'https://vitejs.dev', icon: '⚡', category: '工具', tags: ['构建', '开发工具'] },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', icon: '🎨', category: '工具', tags: ['CSS', '样式'] },
  { name: 'Next.js', url: 'https://nextjs.org', icon: '▲', category: '框架', tags: ['React', 'SSR'] },
  { name: 'Nuxt.js', url: 'https://nuxt.com', icon: '💚', category: '框架', tags: ['Vue', 'SSR'] },
  { name: 'Webpack', url: 'https://webpack.js.org', icon: '📦', category: '工具', tags: ['构建', '打包'] },
  { name: 'Postman', url: 'https://www.postman.com', icon: '🚀', category: '工具', tags: ['API', '测试'] },
  { name: 'Figma', url: 'https://www.figma.com', icon: '🎨', category: '设计', tags: ['UI', '协作'] },
];

// ========== Mock 联盟链接数据 ==========
const affiliates = [
  { name: '腾讯云', url: 'https://cloud.tencent.com', icon: '☁️', category: '云服务', tags: ['服务器', '云'] },
  { name: '阿里云', url: 'https://www.aliyun.com', icon: '🌐', category: '云服务', tags: ['服务器', '云'] },
  { name: 'Vercel', url: 'https://vercel.com', icon: '▲', category: '部署', tags: ['前端', '部署'] },
  { name: 'Netlify', url: 'https://www.netlify.com', icon: '🔷', category: '部署', tags: ['前端', '部署'] },
  { name: 'Cursor', url: 'https://cursor.sh', icon: '🖱️', category: 'AI工具', tags: ['AI', '编辑器'] },
  { name: 'Railway', url: 'https://railway.app', icon: '🚂', category: '部署', tags: ['后端', '部署'] },
  { name: 'Supabase', url: 'https://supabase.com', icon: '⚡', category: 'BaaS', tags: ['数据库', '后端'] },
  { name: 'Cloudflare', url: 'https://www.cloudflare.com', icon: '🛡️', category: '云服务', tags: ['CDN', '安全'] },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 清空所有集合
    await Promise.all([
      User.deleteMany({}),
      Question.deleteMany({}),
      Navigation.deleteMany({}),
      Affiliate.deleteMany({}),
      PracticeRecord.deleteMany({}),
      Feedback.deleteMany({}),
      Favorite.deleteMany({}),
      ChatHistory.deleteMany({}),
    ]);
    console.log('已清空所有集合');

    // 创建用户
    const createdUsers = await User.create(users);
    console.log(`创建 ${createdUsers.length} 个用户`);

    const admins = createdUsers.filter(u => u.role === 'admin');
    const normalUsers = createdUsers.filter(u => u.role === 'user');
    const admin = admins[0];

    // 创建题目（关联到上传用户）
    const questionsWithUser = questions.map((q, i) => ({
      ...q,
      uploadedBy: normalUsers[i % normalUsers.length]._id,
      approvedBy: q.status === 'approved' ? admin._id : undefined,
      stats: {
        views: Math.floor(Math.random() * 500) + 10,
        attempts: Math.floor(Math.random() * 200) + 5,
        correctAttempts: Math.floor(Math.random() * 150) + 1,
      },
    }));
    const createdQuestions = await Question.create(questionsWithUser);
    console.log(`创建 ${createdQuestions.length} 道题目`);

    // 创建导航
    const createdNavs = await Navigation.create(navigations);
    console.log(`创建 ${createdNavs.length} 个导航`);

    // 创建联盟链接
    const createdAffiliates = await Affiliate.create(affiliates);
    console.log(`创建 ${createdAffiliates.length} 个联盟链接`);

    // 创建练习记录（每个用户 8-15 条）
    const practiceRecords = [];
    for (const user of normalUsers) {
      const count = Math.floor(Math.random() * 8) + 8;
      const sampleQuestions = createdQuestions
        .filter(q => q.status === 'approved')
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      for (const q of sampleQuestions) {
        practiceRecords.push({
          userId: user._id,
          questionId: q._id,
          userAnswer: q.answer.substring(0, 80),
          isCorrect: Math.random() > 0.3,
          aiScore: Math.floor(Math.random() * 40) + 60,
          aiAnalysis: '答案基本正确，但可以更详细地展开论述。',
        });
      }
    }
    await PracticeRecord.create(practiceRecords);
    console.log(`创建 ${practiceRecords.length} 条练习记录`);

    // 创建反馈（6 条）
    const feedbacks = [
      { userId: normalUsers[0]._id, questionId: createdQuestions[0]._id, type: 'error_report', content: '答案不够准确，应该补充说明 typeof null 的历史原因', status: 'pending' },
      { userId: normalUsers[1]._id, questionId: createdQuestions[2]._id, type: 'suggestion', content: '建议增加代码示例来说明 var/let/const 的区别', status: 'resolved' },
      { userId: normalUsers[2]._id, questionId: createdQuestions[5]._id, type: 'error_report', content: '闭包的解释缺少内存泄漏相关的注意事项', status: 'pending' },
      { userId: normalUsers[3]._id, questionId: createdQuestions[10]._id, type: 'suggestion', content: '建议增加 Flexbox 和 Grid 的实际使用场景对比', status: 'resolved' },
      { userId: normalUsers[4]._id, questionId: createdQuestions[15]._id, type: 'error_report', content: 'Vue 响应式原理的描述中 Proxy 的示例代码有误', status: 'pending' },
      { userId: normalUsers[5]._id, questionId: createdQuestions[20]._id, type: 'suggestion', content: '建议添加 React Hooks 的常见陷阱和最佳实践', status: 'resolved' },
    ];
    await Feedback.create(feedbacks);
    console.log(`创建 ${feedbacks.length} 条反馈`);

    // 创建收藏（每个用户 2-4 条）
    const favorites = [];
    for (const user of normalUsers) {
      const qCount = Math.floor(Math.random() * 3) + 1;
      const sampleQ = createdQuestions.sort(() => Math.random() - 0.5).slice(0, qCount);
      for (const q of sampleQ) {
        favorites.push({ userId: user._id, itemType: 'question', itemId: q._id });
      }
      if (Math.random() > 0.5) {
        const nav = createdNavs[Math.floor(Math.random() * createdNavs.length)];
        favorites.push({ userId: user._id, itemType: 'navigation', itemId: nav._id });
      }
      if (Math.random() > 0.6) {
        const aff = createdAffiliates[Math.floor(Math.random() * createdAffiliates.length)];
        favorites.push({ userId: user._id, itemType: 'affiliate', itemId: aff._id });
      }
    }
    await Favorite.create(favorites);
    console.log(`创建 ${favorites.length} 条收藏`);

    // 创建面试辅导对话历史
    const chatHistories = [
      {
        userId: normalUsers[0]._id,
        type: 'interview',
        title: '前端面试常见问题准备',
        messages: [
          { role: 'user', content: '请帮我准备前端开发工程师的面试常见问题' },
          { role: 'assistant', content: '好的，前端面试通常涵盖以下几个方面：\n1. JavaScript 基础（闭包、原型链、异步）\n2. CSS 布局（Flex、Grid、BFC）\n3. 框架原理（Vue/React 响应式、虚拟DOM）\n4. 性能优化（懒加载、CDN、缓存）\n5. 工程化（Webpack、Git、CI/CD）' },
        ],
        lastMessageAt: new Date(),
      },
      {
        userId: normalUsers[1]._id,
        type: 'resume',
        title: '简历优化建议',
        messages: [
          { role: 'user', content: '我是应届生，简历应该怎么写才能突出亮点？' },
          { role: 'assistant', content: '应届生简历建议：\n1. 项目经历用 STAR 法则描述\n2. 突出技术栈和解决问题的能力\n3. 开源贡献、博客、竞赛经历加分\n4. 控制在一页以内' },
        ],
        lastMessageAt: new Date(),
      },
      {
        userId: normalUsers[2]._id,
        type: 'career',
        title: '前端职业发展路线',
        messages: [
          { role: 'user', content: '前端工程师的职业发展路线是什么？' },
          { role: 'assistant', content: '前端职业发展路线：\n初级 → 中级 → 高级 → 架构师/技术专家\n横向：全栈、移动端、跨平台、可视化\n管理线：Tech Lead → 技术经理 → CTO' },
        ],
        lastMessageAt: new Date(),
      },
    ];
    await ChatHistory.create(chatHistories);
    console.log(`创建 ${chatHistories.length} 条对话历史`);

    console.log('\n✅ Mock 数据创建完成！');
    console.log('\n📋 测试账号列表：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('管理员：admin / admin123');
    console.log('管理员：admin_li / admin123');
    console.log('普通用户：zhangsan / test123');
    console.log('普通用户：lisi / test123');
    console.log('普通用户：wangwu / test123');
    console.log('普通用户：zhaoliu / test123');
    console.log('普通用户：sunqi / test123');
    console.log('普通用户：zhouba / test123');
    console.log('普通用户：wujiu / test123');
    console.log('普通用户：zhengshi / test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 数据统计：`);
    console.log(`  用户: ${createdUsers.length} | 题目: ${createdQuestions.length} | 导航: ${createdNavs.length}`);
    console.log(`  联盟: ${createdAffiliates.length} | 练习: ${practiceRecords.length} | 收藏: ${favorites.length}`);
    console.log(`  反馈: ${feedbacks.length} | 对话: ${chatHistories.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed 失败:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();

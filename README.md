# Atoms Demo

一个类似 Atoms 的 AI Agent 平台，通过自然语言描述需求，AI 自动生成可运行的网页应用。

## 功能特性

- ✅ 用户认证（注册/登录/登出）
- ✅ 对话式代码生成
- ✅ 实时预览（iframe）
- ✅ 多模型支持（OpenAI/Anthropic 兼容）
- ✅ 版本历史
- ✅ 代码导出（HTML 下载）
- ✅ 项目管理（按用户隔离数据）

## 技术栈

- **前端**: Next.js 14 + Tailwind CSS + Shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: JSON 文件存储
- **AI**: OpenAI SDK（支持配置 base URL）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件：

```env
# 默认 API 配置（可选）
DEFAULT_API_BASE_URL=https://api.openai.com/v1
DEFAULT_API_KEY=your-api-key
DEFAULT_MODEL=gpt-4
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 生产部署

```bash
npm run build
npm start
```

## 使用说明

1. 访问 http://localhost:3000 将自动跳转到登录页面
2. 注册一个新账号或使用已有账号登录
3. 登录后点击"新建项目"创建一个新项目
4. 在左侧对话框中描述你想要的网页应用
5. AI 将生成代码并在右侧实时预览
6. 可以继续对话修改，或查看版本历史
7. 支持下载生成的代码为 HTML 文件

## 注意事项

- **开发模式**: 页面左下角会显示 Next.js DevTools 图标（"N"），这是正常的，仅在开发环境出现
- **生产模式**: 使用 `npm run build && npm start` 部署后，DevTools 图标不会显示
- **暗色模式**: 应用默认使用亮色主题，如遇显示异常请检查浏览器/系统主题设置

## 用户认证

- 每个用户的数据完全隔离
- 使用 JWT 进行身份验证
- 密码使用 bcrypt 加密存储
- 支持注册、登录、登出功能

## API 配置

在设置中配置 AI 模型的 API 信息：

- **API 格式**: OpenAI 兼容 / Anthropic 兼容
- **API 地址**: 如 `https://api.openai.com/v1` 或 `https://token-plan-cn.xiaomimimo.com/v1`
- **API Key**: 你的 API 密钥
- **模型**: 如 `gpt-4`、`claude-3-opus` 等

## 部署到服务器

### 方式 1: 直接部署

```bash
# 在服务器上
git clone <your-repo-url>
cd atoms-demo
npm install
npm run build
npm start
```

### 方式 2: 使用 PM2

```bash
npm install -g pm2
npm run build
pm2 start npm --name "atoms-demo" -- start
```

### 方式 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 项目结构

```
atoms-demo/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/      # 认证 API（登录/注册/登出）
│   │   │   ├── generate/  # AI 生成 API
│   │   │   └── projects/  # 项目 API
│   │   ├── auth/          # 登录/注册页面
│   │   ├── page.tsx       # 主页面
│   │   └── layout.tsx     # 布局
│   ├── components/
│   │   ├── chat/          # 对话组件
│   │   ├── layout/        # 布局组件
│   │   ├── preview/       # 预览组件
│   │   ├── projects/      # 项目组件
│   │   ├── settings/      # 设置组件
│   │   └── ui/            # UI 组件
│   ├── lib/
│   │   ├── auth.ts        # JWT 认证工具
│   │   ├── db.ts          # 数据库操作
│   │   ├── store.ts       # 状态管理
│   │   └── utils.ts       # 工具函数
│   └── middleware.ts      # 路由保护中间件
├── data/                  # 数据存储目录
└── docs/                  # 文档
```

## License

MIT

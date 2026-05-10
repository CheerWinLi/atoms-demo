# Atoms Demo 设计文档

## 概述

构建一个类似 Atoms 的 AI Agent 平台，用户通过自然语言描述需求，AI 自动生成可运行的网页应用，并提供实时预览。

## 技术栈

| 层次 | 技术选择 | 说明 |
|------|---------|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS + Shadcn/ui | 现代化 UI，快速开发 |
| 后端 | Next.js API Routes | 无需独立服务 |
| 数据库 | SQLite + Prisma | 轻量级持久化 |
| AI | OpenAI SDK | 支持配置 base URL，兼容多种 API |
| 部署 | 自有服务器 (2核4G) | 完全可控 |

## AI API 集成

### 支持的 API

1. **OpenAI 兼容格式**
   - 默认端点: `https://api.openai.com/v1`
   - mimo 端点: `https://token-plan-cn.xiaomimimo.com/v1`

2. **Anthropic 兼容格式**
   - mimo 端点: `https://token-plan-cn.xiaomimimo.com/anthropic`

### 配置方式

用户在设置页面配置:
- API 格式 (OpenAI / Anthropic)
- API Base URL
- API Key
- Model Name

## 核心功能

### 1. 项目管理
- 创建新项目
- 项目列表（侧边栏或下拉菜单）
- 项目重命名、删除

### 2. 对话式代码生成
- 用户输入自然语言需求
- AI 生成完整的 HTML/CSS/JS 代码
- 支持流式响应
- 上下文保持（多轮对话）

### 3. 实时预览
- iframe 沙箱渲染
- 自动刷新
- 响应式预览（可选）

### 4. 版本历史
- 每次生成保存为一个版本
- 版本列表展示
- 可切换/恢复历史版本

### 5. 代码导出
- 查看源代码
- 下载为 ZIP 文件

## UI 布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Atoms Demo                    [项目列表▼] [设置⚙] [新建项目+]  │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│          对话区域                 │         实时预览             │
│                                  │                              │
│  [用户]: 帮我创建一个 Todo 应用  │   ┌──────────────────────┐   │
│                                  │   │                      │   │
│  [AI]: 好的，我来生成...         │   │   生成的网页应用      │   │
│                                  │   │   (iframe 预览)      │   │
│  [代码预览...]                   │   │                      │   │
│                                  │   └──────────────────────┘   │
│                                  │                              │
│  ┌────────────────────────────┐  │   [查看代码] [下载ZIP]       │
│  │ 输入你的需求...            │  │   [版本历史▼]                │
│  └────────────────────────────┘  │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

## 数据模型

### Project
- id: string (UUID)
- name: string
- createdAt: DateTime
- updatedAt: DateTime

### Conversation
- id: string (UUID)
- projectId: string (FK)
- role: "user" | "assistant"
- content: string
- createdAt: DateTime

### Version
- id: string (UUID)
- projectId: string (FK)
- code: string (HTML/CSS/JS)
- description: string
- createdAt: DateTime

### Settings (localStorage)
- apiFormat: "openai" | "anthropic"
- baseUrl: string
- apiKey: string
- model: string

## Prompt 设计

### 系统 Prompt

```
你是一个专业的前端开发助手。用户会描述他们想要的网页应用，你需要生成完整的、可运行的 HTML/CSS/JS 代码。

要求：
1. 生成单个 HTML 文件，包含所有 CSS 和 JS
2. 代码必须完整、可立即运行
3. 使用现代 CSS（Flexbox/Grid）和原生 JavaScript
4. 界面美观、响应式
5. 功能完整、可用

输出格式：
```html
<!DOCTYPE html>
<html>
...
</html>
```
```

### 用户 Prompt

```
{用户输入的需求}
```

## 实现步骤

1. **项目初始化**
   - 创建 Next.js 项目
   - 配置 Tailwind CSS 和 Shadcn/ui
   - 初始化 Prisma 和 SQLite

2. **数据模型实现**
   - 定义 Prisma schema
   - 创建 API 路由

3. **UI 组件开发**
   - 布局组件
   - 对话组件
   - 预览组件
   - 设置组件

4. **AI 集成**
   - 实现 OpenAI SDK 调用
   - 支持流式响应
   - Prompt 工程

5. **核心功能实现**
   - 项目管理
   - 对话历史
   - 实时预览
   - 版本管理
   - 代码导出

6. **部署**
   - 配置服务器环境
   - 部署应用
   - 测试验证

## 时间估算

- 项目初始化: 30分钟
- 数据模型: 30分钟
- UI 组件: 2小时
- AI 集成: 1小时
- 核心功能: 2小时
- 测试优化: 1小时
- 部署: 30分钟

**总计: 约 7.5 小时**

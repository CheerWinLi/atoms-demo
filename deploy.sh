#!/bin/bash

# Atoms Demo 部署脚本

set -e

echo "🚀 开始部署 Atoms Demo..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v)
echo "Node.js 版本: $NODE_VERSION"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 创建数据目录
mkdir -p data

# 检查是否安装了 PM2
if command -v pm2 &> /dev/null; then
    echo "🔧 使用 PM2 启动..."
    pm2 delete atoms-demo 2>/dev/null || true
    pm2 start npm --name "atoms-demo" -- start
    pm2 save
    echo "✅ 部署完成！使用 'pm2 logs atoms-demo' 查看日志"
else
    echo "⚠️  PM2 未安装，使用 npm start 启动..."
    echo "💡 建议安装 PM2: npm install -g pm2"
    echo "🚀 启动应用..."
    npm start
fi

#!/bin/bash

# CocoFlix 项目初始化脚本
# 用法: bash scripts/setup.sh

set -e

echo "=========================================="
echo "  CocoFlix 项目初始化"
echo "=========================================="
echo ""

# 检查 Node.js 版本
echo "[1/7] 检查 Node.js 版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: 需要 Node.js 18+，当前版本: $(node -v)"
    exit 1
fi
echo "Node.js 版本: $(node -v)"

# 检查 Docker
echo "[2/7] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "警告: Docker 未安装，将跳过数据库初始化"
    SKIP_DOCKER=true
else
    echo "Docker 版本: $(docker -v)"
fi

# 复制环境变量
echo "[3/7] 配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "已创建 .env 文件"
else
    echo ".env 文件已存在，跳过"
fi

# 安装依赖
echo "[4/7] 安装依赖..."
npm install

# 启动数据库
if [ "$SKIP_DOCKER" != "true" ]; then
    echo "[5/7] 启动数据库..."
    docker-compose -f docker-compose.dev.yml up -d

    echo "等待数据库启动..."
    sleep 5

    echo "[6/7] 运行数据库迁移..."
    npm run typeorm:migration:run || echo "迁移失败，可能是首次运行，将使用 synchronize 模式"

    echo "[7/7] 初始化种子数据..."
    npm run seed || echo "种子数据初始化失败，请手动运行: npm run seed"
else
    echo "[5/7] 跳过数据库启动 (Docker 未安装)"
    echo "[6/7] 跳过数据库迁移"
    echo "[7/7] 跳过种子数据"
fi

echo ""
echo "=========================================="
echo "  初始化完成！"
echo "=========================================="
echo ""
echo "启动开发服务器:"
echo "  npm run dev"
echo ""
echo "启动数据库 (如果未启动):"
echo "  docker-compose -f docker-compose.dev.yml up -d"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:3000"
echo "  API:  http://localhost:4000/api/v1"
echo "  Swagger: http://localhost:4000/api/docs"
echo ""
echo "默认管理员账号:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""

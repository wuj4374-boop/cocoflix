FROM node:20-slim

# bcrypt 编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 workspace 配置
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN npm ci

# 复制源码
COPY tsconfig.base.json ./
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

# 构建 API
RUN npm run build:api

# 精简依赖
RUN npm prune --production

# 创建数据和存储目录
RUN mkdir -p /data /storage/tmdb-images /storage/avatars

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main.js"]

# CocoFlix 部署指南

免费方案：前端 Vercel + 后端 Render，国内浏览器可直接访问。

---

## 当前状态

- GitHub 仓库：https://github.com/wuj4374-boop/cocoflix
- 前端已部署到 Vercel：https://cocoflix-xi.vercel.app
- 后端需要部署到 Render

---

## 第一步：部署后端（Render）

### 1. 创建 Blueprint 服务

1. 打开 [Render Dashboard](https://dashboard.render.com)
2. 点击 **New +** → **Blueprint**
3. 选择 `cocoflix` 仓库（如果没看到，先连接 GitHub 授权）
4. Render 会自动识别 `render.yaml`，显示 `cocoflix-api` 服务
5. 点击 **Apply** 创建服务

### 2. 等待构建

- 构建过程约 3-5 分钟
- Render 会自动执行：`npm ci` → `npm run build:api` → `node dist/main.js`
- 首次启动会自动初始化：
  - 管理员账号：`admin` / `admin123`
  - 18 个默认分类
  - 12 个资源站

### 3. 获取后端域名

构建成功后，Render 会分配一个域名，格式如：
```
https://cocoflix-api-xxx.onrender.com
```

**记下这个域名**，后面要用。

### 4. 验证后端

访问 `https://cocoflix-api-xxx.onrender.com/api/v1/health`，应该返回：
```json
{
  "code": 0,
  "message": "系统正常",
  "status": "ok",
  ...
}
```

### 5. 设置环境变量（可选但推荐）

在 Render Dashboard → cocoflix-api → Environment 中设置：

| 变量 | 值 | 说明 |
|------|-----|------|
| `CORS_ORIGIN` | `https://cocoflix-xi.vercel.app` | 限制 CORS 只允许你的前端域名 |
| `TMDB_API_KEY` | 你的 TMDB API Key | 用于获取影片海报和元数据 |

> 如果不设置 `CORS_ORIGIN`，默认允许所有来源（`*`），个人使用也 OK。

---

## 第二步：更新前端环境变量（Vercel）

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择 `cocoflix` 项目
3. 进入 **Settings** → **Environment Variables**
4. 添加/修改环境变量：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://cocoflix-api-xxx.onrender.com` |

> 把 `cocoflix-api-xxx.onrender.com` 替换为你在 Render 拿到的实际域名。
> **注意**：不要在 URL 末尾加 `/api/v1`，只需填后端的基础域名。

5. 点击 **Save**
6. 进入 **Deployments**，点击最新部署右边的 **...** → **Redeploy**
7. 等待重新部署完成（约 1 分钟）

---

## 第三步：验证全链路

1. 打开 https://cocoflix-xi.vercel.app
2. 用默认账号登录：`admin` / `admin123`
3. 搜索影片 → 选择来源 → 播放

---

## 防止后端休眠（可选）

Render 免费计划 15 分钟无请求会休眠，首次访问需等 30 秒冷启动。可以用定时 ping 避免：

1. 注册 [cron-job.org](https://cron-job.org)（免费）
2. 创建新任务：
   - **URL**: `https://cocoflix-api-xxx.onrender.com/api/v1/health`
   - **间隔**: 每 14 分钟
3. 保存即可

---

## 架构说明

```
┌─────────────────┐         ┌─────────────────────┐
│  Vercel (前端)   │         │  Render (后端)       │
│  Next.js         │────────▶│  NestJS + sql.js     │
│  cocoflix-xi     │ /api/*  │  cocoflix-api        │
│  .vercel.app     │ proxy   │  .onrender.com       │
└─────────────────┘         └─────────────────────┘
```

- 前端通过 Next.js rewrites 将 `/api/v1/*` 请求代理到后端
- 后端使用 sql.js（WASM SQLite）存储数据，挂载 1GB 持久化磁盘
- 数据库文件在 `/data/cocoflix.db`，重启不丢失

---

## 常见问题

**Q: 打开白屏 / 接口报错？**
A: 后端可能在休眠，等 30 秒刷新重试。或检查 Vercel 环境变量 `NEXT_PUBLIC_API_URL` 是否正确。

**Q: CORS 报错？**
A: 在 Render 环境变量中设置 `CORS_ORIGIN` 为你的 Vercel 域名（如 `https://cocoflix-xi.vercel.app`）。

**Q: 视频播放不了？**
A: 资源站的链接有时效性，换一个来源试试。部分资源站可能临时不可用。

**Q: 免费额度够用吗？**
A: Vercel 免费计划每月 100GB 流量，Render 免费 750 小时/月。个人使用完全够。

**Q: 怎么更新代码？**
A: 推送到 GitHub 后，Render 会自动重新部署后端。Vercel 也会自动重新部署前端。

**Q: Render 构建失败？**
A: 检查 Render 的构建日志。常见原因：bcrypt 编译失败（Dockerfile 已包含 python3/make/g++ 依赖）。

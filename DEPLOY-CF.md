# CocoFlix 部署指南（国内可访问版）

## 架构说明

```
国内用户 → Vercel（前端）→ Cloudflare Worker（API代理）→ Render（后端API）
```

- **前端**：Vercel 托管 Next.js 静态站点
- **API代理**：Cloudflare Worker 转发请求到 Render（CF 国内连接性更好）
- **后端**：Render 托管 NestJS API + SQLite 数据库

## 第一步：部署 Cloudflare Worker（API代理）

### 1.1 注册 Cloudflare
1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册（免费）

### 1.2 创建 Worker
1. 登录 Cloudflare Dashboard
2. 左侧菜单点击 **Workers & Pages**
3. 点击 **Create Application**
4. 点击 **Create Worker**
5. 名称填 `cocoflix-api`，点击 **Deploy**
6. 点击 **Edit Code**
7. 删除默认代码，粘贴 `cf-worker/worker.js` 的全部内容
8. 点击 **Save and Deploy**
9. 记下 Worker URL（格式：`https://cocoflix-api.你的用户名.workers.dev`）

### 1.3 测试 Worker
在浏览器访问：`https://你的worker-url/api/v1/health`
应该返回后端的健康检查响应。

## 第二步：更新 Vercel 前端环境变量

1. 打开 https://vercel.com/dashboard
2. 进入 cocoflix 项目
3. Settings → Environment Variables
4. 设置：
   - `NEXT_PUBLIC_API_URL` = `https://你的worker-url`（不带 /api/v1 后缀）
5. 重新部署前端

## 第三步：保持 Render 后端活跃

Render 免费版 15 分钟无请求会休眠。使用 cron-job.org 保持活跃：

1. 打开 https://cron-job.org 注册
2. 创建新任务：
   - URL: `https://cocoflix-hijp.onrender.com/api/v1/health`
   - 间隔: 每 10 分钟
   - Method: GET
3. 保存

## 第四步：测试

1. 打开 Vercel 分配的域名
2. 注册/登录
3. 搜索影片
4. 播放测试

## 故障排除

### "网络连接失败"
- 检查 Worker URL 是否正确
- 在浏览器直接访问 Worker URL 测试
- Render 后端可能在休眠，等 30 秒后重试

### 搜不到影片
- 确认 Render 后端已唤醒（访问 /api/v1/source/sources 测试）
- 检查 Vercel 环境变量 NEXT_PUBLIC_API_URL 是否正确

### 字体重叠
- 已修复：使用 fonts.font.im 替代 Google Fonts
- 如果仍有问题，刷新页面（Ctrl+F5）

## 文件清单

- `cf-worker/worker.js` — Cloudflare Worker 代理脚本
- `cf-worker/wrangler.toml` — Worker 配置（可选，用于 CLI 部署）

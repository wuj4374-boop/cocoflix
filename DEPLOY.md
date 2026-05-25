# CocoFlix 部署指南

免费方案：前端 Vercel + 后端 Render，国内浏览器可直接访问。

---

## 前置准备

1. 注册 [GitHub](https://github.com) 账号
2. 注册 [Vercel](https://vercel.com) 账号（用 GitHub 登录）
3. 注册 [Render](https://render.com) 账号（用 GitHub 登录）

---

## 第一步：上传代码到 GitHub

1. 在 GitHub 创建一个新仓库（如 `cocoflix`）
2. 把本地代码推上去：

```bash
cd cocoflix
git init
git add .
git commit -m "init: cocoflix"
git remote add origin https://github.com/你的用户名/cocoflix.git
git push -u origin main
```

---

## 第二步：部署后端（Render）

1. 打开 [Render Dashboard](https://dashboard.render.com)
2. 点击 **New +** → **Blueprint**
3. 选择你刚推上去的 `cocoflix` 仓库
4. Render 会自动识别 `render.yaml`，显示 `cocoflix-api` 服务
5. 点击 **Apply** 创建服务
6. 等待构建完成（约 3-5 分钟）
7. 构建成功后，Render 会分配一个域名，格式如：`https://cocoflix-api-xxx.onrender.com`
8. **记下这个域名**，后面要用

> 首次启动会自动创建管理员账号（admin / admin123）和 12 个资源站。

---

## 第三步：部署前端（Vercel）

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New...** → **Project**
3. 选择 `cocoflix` 仓库
4. **Framework Preset** 选 `Next.js`
5. **Root Directory** 设置为 `apps/web`
6. 展开 **Environment Variables**，添加：
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://cocoflix-api-xxx.onrender.com/api/v1`（第二步拿到的域名 + `/api/v1`）
7. 点击 **Deploy**
8. 等待构建完成（约 1-2 分钟）
9. 构建成功后，Vercel 会分配一个域名，格式如：`https://cocoflix-xxx.vercel.app`
10. **这个就是你的网站地址**，国内浏览器可直接访问

---

## 第四步：防止后端休眠（可选）

Render 免费计划 15 分钟无请求会休眠，首次访问需等 30 秒冷启动。可以用定时 ping 避免：

1. 注册 [cron-job.org](https://cron-job.org)（免费）
2. 创建新任务：
   - **URL**: `https://cocoflix-api-xxx.onrender.com/api/v1/health`
   - **间隔**: 每 14 分钟
3. 保存即可

---

## 使用方式

1. 浏览器打开 Vercel 分配的域名
2. 注册账号或用默认管理员登录（admin / admin123）
3. 搜索影片 → 选择来源 → 播放

---

## 常见问题

**Q: 打开白屏 / 接口报错？**
A: 后端可能在休眠，等 30 秒刷新重试。或检查 Vercel 环境变量 `NEXT_PUBLIC_API_URL` 是否正确。

**Q: 视频播放不了？**
A: 资源站的链接有时效性，换一个来源试试。部分资源站可能临时不可用。

**Q: 免费额度够用吗？**
A: Vercel 免费计划每月 100GB 流量，Render 免费 750 小时/月。个人使用完全够。

**Q: 怎么更新代码？**
A: 推送到 GitHub 后，Vercel 和 Render 会自动重新部署。

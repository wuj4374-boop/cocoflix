const path = require('path');

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DB_PATH = process.env.DB_PATH || '/tmp/cocoflix.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'cocoflix-vercel-default-secret';
process.env.API_PREFIX = process.env.API_PREFIX || 'api/v1';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
process.env.SWAGGER_ENABLED = 'false';

let appPromise = null;

function getApp() {
  if (!appPromise) {
    // 动态导入编译后的 NestJS 应用
    appPromise = import(path.join(__dirname, '..', 'apps', 'api', 'dist', 'main.js'))
      .then((mod) => mod.createApp())
      .catch((err) => {
        console.error('Failed to initialize NestJS app:', err);
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

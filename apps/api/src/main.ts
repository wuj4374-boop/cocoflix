import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import express from 'express';
import * as bcrypt from 'bcrypt';

import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/winston-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { User, UserRole } from './modules/user/entities/user.entity';
import { Genre } from './modules/media/entities/genre.entity';
import { Source } from './modules/source/entities/source.entity';

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WinstonLoggerService);

  app.useLogger(logger);

  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // 静态文件服务：头像
  const isVercel = !!process.env.VERCEL;
  const storagePath = configService.get<string>('STORAGE_PATH', join(process.cwd(), '..', '..', 'storage'));
  const avatarsDir = isVercel
    ? '/tmp/avatars'
    : join(storagePath, 'avatars');
  app.use(`/${apiPrefix}/avatars`, express.static(avatarsDir));

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      message: {
        code: 40005,
        message: '请求过于频繁，请稍后再试',
        error: 'Too Many Requests',
        timestamp: new Date().toISOString(),
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(logger), new TransformInterceptor());

  // Swagger (仅非 Vercel 环境)
  if (!isVercel) {
    const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);
    if (swaggerEnabled) {
      const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api/docs');
      const config = new DocumentBuilder()
        .setTitle('CocoFlix API')
        .setDescription('CocoFlix 私人流媒体影院系统 API 文档')
        .setVersion('1.0.0')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', description: 'JWT Token', in: 'header' },
          'access-token',
        )
        .addTag('认证', '用户认证相关接口')
        .addTag('媒体', '媒体资源管理接口')
        .addTag('用户', '用户信息管理接口')
        .addTag('进度', '观看进度管理接口')
        .addTag('收藏', '收藏管理接口')
        .addTag('资源聚合', '资源站聚合搜索接口')
        .addTag('搜索', '本地搜索接口')
        .addTag('元数据', 'TMDB元数据接口')
        .addTag('健康检查', '系统健康状态接口')
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(swaggerPath, app, document, { swaggerOptions: { persistAuthorization: true } });
      logger.log(`Swagger 文档已启用: http://localhost:${configService.get('APP_PORT', 4000)}/${swaggerPath}`, 'Bootstrap');
    }
  }

  await app.init();

  // 首次启动自动初始化种子数据
  try {
    const dataSource = app.get(DataSource);
    const sourceCount = await dataSource.getRepository(Source).count();
    if (sourceCount === 0) {
      const logger = app.get(WinstonLoggerService);
      logger.log('检测到空数据库，开始自动初始化...', 'Bootstrap');

      const userRepo = dataSource.getRepository(User);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      const admin = userRepo.create({ username: 'admin', passwordHash, email: 'admin@cocoflix.com', role: UserRole.ADMIN });
      await userRepo.save(admin);
      logger.log('管理员账号已创建: admin / admin123', 'Bootstrap');

      const genreRepo = dataSource.getRepository(Genre);
      const genres = [
        { name: '动作', slug: 'action' }, { name: '喜剧', slug: 'comedy' },
        { name: '剧情', slug: 'drama' }, { name: '科幻', slug: 'sci-fi' },
        { name: '恐怖', slug: 'horror' }, { name: '爱情', slug: 'romance' },
        { name: '动画', slug: 'animation' }, { name: '纪录片', slug: 'documentary' },
        { name: '悬疑', slug: 'mystery' }, { name: '奇幻', slug: 'fantasy' },
        { name: '冒险', slug: 'adventure' }, { name: '犯罪', slug: 'crime' },
        { name: '战争', slug: 'war' }, { name: '历史', slug: 'history' },
        { name: '音乐', slug: 'music' }, { name: '家庭', slug: 'family' },
        { name: '西部', slug: 'western' }, { name: '惊悚', slug: 'thriller' },
      ];
      for (const g of genres) { await genreRepo.save(genreRepo.create(g)); }
      logger.log(`${genres.length} 个默认分类已创建`, 'Bootstrap');

      const sourceRepo = dataSource.getRepository(Source);
      const sources = [
        { id: 'heimuer', name: '黑木耳资源', type: 'm3u8', url: 'https://json.heimuer.xyz', priority: 1, timeout: 10000, retryCount: 3, config: {} },
        { id: 'ffzy', name: '非凡资源', type: 'm3u8', url: 'https://cj.ffzyapi.com', priority: 2, timeout: 10000, retryCount: 3, config: {} },
        { id: 'hongniu', name: '红牛资源', type: 'm3u8', url: 'https://www.hongniuzy2.com', priority: 3, timeout: 10000, retryCount: 3, config: {} },
        { id: 'wolong', name: '卧龙资源', type: 'm3u8', url: 'https://collect.wolongzyw.com', priority: 4, timeout: 10000, retryCount: 3, config: {} },
        { id: 'kuaikan', name: '快看资源', type: 'm3u8', url: 'https://kuaikanapi.com', priority: 5, timeout: 10000, retryCount: 3, config: {} },
        { id: 'bfzy', name: '暴风资源', type: 'm3u8', url: 'https://bfzyapi.com', priority: 6, timeout: 10000, retryCount: 3, config: {} },
        { id: 'lzzy', name: '量子资源', type: 'm3u8', url: 'https://cj.lziapi.com', priority: 7, timeout: 10000, retryCount: 3, config: {} },
        { id: 'bangumi', name: 'Bangumi', type: 'anime', url: 'https://api.bgm.tv', priority: 1, timeout: 15000, retryCount: 3, config: {} },
        { id: 'agefans', name: 'AGE动漫', type: 'anime', url: 'https://www.agemys.org', priority: 2, timeout: 12000, retryCount: 3, config: {} },
        { id: 'nyafun', name: '尼亚动漫', type: 'anime', url: 'https://nyafun.net', priority: 3, timeout: 12000, retryCount: 3, config: {} },
        { id: 'upyunso', name: '趣盘搜', type: 'cloud', url: 'https://upyun.so', priority: 1, timeout: 15000, retryCount: 2, config: {} },
        { id: 'pansearch', name: '盘搜', type: 'cloud', url: 'https://www.pansearch.me', priority: 2, timeout: 15000, retryCount: 2, config: {} },
      ];
      for (const s of sources) { await sourceRepo.save(sourceRepo.create({ ...s, enabled: true })); }
      logger.log(`${sources.length} 个资源站已创建`, 'Bootstrap');
      logger.log('自动初始化完成！', 'Bootstrap');
    }
  } catch (seedError) {
    console.error('自动初始化失败:', seedError);
  }

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const logger = app.get(WinstonLoggerService);

  const port = configService.get<number>('APP_PORT', 4000);
  await app.listen(port);

  logger.log(`CocoFlix API 已启动: http://localhost:${port}/${configService.get('API_PREFIX', 'api/v1')}`, 'Bootstrap');
  logger.log(`环境: ${configService.get('NODE_ENV', 'development')}`, 'Bootstrap');
}

bootstrap();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

import { User, UserRole } from '../../modules/user/entities/user.entity';
import { Genre } from '../../modules/media/entities/genre.entity';
import { Source } from '../../modules/source/entities/source.entity';

const dataSource = new DataSource({
  type: 'sqljs',
  entities: [join(__dirname, '..', '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  synchronize: true,
  autoSave: true,
  location: process.env.DB_PATH || './data/cocoflix.db',
});

async function seed() {
  console.log('开始初始化种子数据...');

  await dataSource.initialize();
  console.log('数据库连接成功');

  // 创建管理员用户
  const userRepository = dataSource.getRepository(User);
  const existingAdmin = await userRepository.findOne({ where: { username: 'admin' } });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const admin = userRepository.create({
      username: 'admin',
      passwordHash,
      email: 'admin@cocoflix.com',
      role: UserRole.ADMIN,
    });

    await userRepository.save(admin);
    console.log('管理员用户创建成功: admin / admin123');
  } else {
    console.log('管理员用户已存在，跳过创建');
  }

  // 创建默认分类
  const genreRepository = dataSource.getRepository(Genre);
  const defaultGenres = [
    { name: '动作', slug: 'action' },
    { name: '喜剧', slug: 'comedy' },
    { name: '剧情', slug: 'drama' },
    { name: '科幻', slug: 'sci-fi' },
    { name: '恐怖', slug: 'horror' },
    { name: '爱情', slug: 'romance' },
    { name: '动画', slug: 'animation' },
    { name: '纪录片', slug: 'documentary' },
    { name: '悬疑', slug: 'mystery' },
    { name: '奇幻', slug: 'fantasy' },
    { name: '冒险', slug: 'adventure' },
    { name: '犯罪', slug: 'crime' },
    { name: '战争', slug: 'war' },
    { name: '历史', slug: 'history' },
    { name: '音乐', slug: 'music' },
    { name: '家庭', slug: 'family' },
    { name: '西部', slug: 'western' },
    { name: '惊悚', slug: 'thriller' },
  ];

  for (const genreData of defaultGenres) {
    const existing = await genreRepository.findOne({ where: { slug: genreData.slug } });
    if (!existing) {
      const genre = genreRepository.create(genreData);
      await genreRepository.save(genre);
    }
  }
  console.log(`分类数据初始化完成: ${defaultGenres.length} 个分类`);

  // 初始化资源站配置
  const sourceRepository = dataSource.getRepository(Source);
  const defaultSources = [
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

  let sourceCount = 0;
  for (const sourceData of defaultSources) {
    const existing = await sourceRepository.findOne({ where: { id: sourceData.id } });
    if (!existing) {
      const source = sourceRepository.create({ ...sourceData, enabled: true });
      await sourceRepository.save(source);
      sourceCount++;
    }
  }
  console.log(`资源站数据初始化完成: ${sourceCount} 个新源, 共 ${defaultSources.length} 个`);

  console.log('种子数据初始化完成！');
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('种子数据初始化失败:', error);
  process.exit(1);
});

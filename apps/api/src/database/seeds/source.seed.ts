import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

import { Source } from '../../modules/source/entities/source.entity';

const defaultSources = [
  // ==================== M3U8 Sources ====================
  {
    id: 'heimuer',
    name: '黑木耳资源',
    type: 'm3u8',
    url: 'https://json.heimuer.xyz',
    enabled: true,
    priority: 1,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'ffzy',
    name: '非凡资源',
    type: 'm3u8',
    url: 'https://cj.ffzyapi.com',
    enabled: true,
    priority: 2,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'hongniu',
    name: '红牛资源',
    type: 'm3u8',
    url: 'https://www.hongniuzy2.com',
    enabled: true,
    priority: 3,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'wolong',
    name: '卧龙资源',
    type: 'm3u8',
    url: 'https://collect.wolongzyw.com',
    enabled: true,
    priority: 4,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'kuaikan',
    name: '快看资源',
    type: 'm3u8',
    url: 'https://kuaikanapi.com',
    enabled: true,
    priority: 5,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'bfzy',
    name: '暴风资源',
    type: 'm3u8',
    url: 'https://bfzyapi.com',
    enabled: true,
    priority: 6,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'lzzy',
    name: '量子资源',
    type: 'm3u8',
    url: 'https://cj.lziapi.com',
    enabled: true,
    priority: 7,
    timeout: 10000,
    retryCount: 3,
    config: {},
  },

  // ==================== Anime Sources ====================
  {
    id: 'bangumi',
    name: 'Bangumi',
    type: 'anime',
    url: 'https://api.bgm.tv',
    enabled: true,
    priority: 1,
    timeout: 15000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'agefans',
    name: 'AGE动漫',
    type: 'anime',
    url: 'https://www.agemys.org',
    enabled: true,
    priority: 2,
    timeout: 12000,
    retryCount: 3,
    config: {},
  },
  {
    id: 'nyafun',
    name: '尼亚动漫',
    type: 'anime',
    url: 'https://nyafun.net',
    enabled: true,
    priority: 3,
    timeout: 12000,
    retryCount: 3,
    config: {},
  },

  // ==================== Cloud Sources ====================
  {
    id: 'upyunso',
    name: '趣盘搜',
    type: 'cloud',
    url: 'https://upyun.so',
    enabled: true,
    priority: 1,
    timeout: 15000,
    retryCount: 2,
    config: {},
  },
  {
    id: 'pansearch',
    name: '盘搜',
    type: 'cloud',
    url: 'https://www.pansearch.me',
    enabled: true,
    priority: 2,
    timeout: 15000,
    retryCount: 2,
    config: {},
  },
];

const dataSource = new DataSource({
  type: 'sqljs',
  entities: [join(__dirname, '..', '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  synchronize: true,
  autoSave: true,
  location: process.env.DB_PATH || './data/cocoflix.db',
});

async function seedSources() {
  console.log('开始初始化资源站数据...');

  await dataSource.initialize();
  console.log('数据库连接成功');

  const sourceRepository = dataSource.getRepository(Source);

  for (const sourceData of defaultSources) {
    const existing = await sourceRepository.findOne({ where: { id: sourceData.id } });

    if (!existing) {
      const source = sourceRepository.create(sourceData);
      await sourceRepository.save(source);
      console.log(`  创建资源源: ${sourceData.name} (${sourceData.id})`);
    } else {
      // Update URL and config if changed
      existing.name = sourceData.name;
      existing.url = sourceData.url;
      existing.type = sourceData.type;
      existing.priority = sourceData.priority;
      existing.timeout = sourceData.timeout;
      existing.retryCount = sourceData.retryCount;
      existing.config = sourceData.config;
      await sourceRepository.save(existing);
      console.log(`  更新资源源: ${sourceData.name} (${sourceData.id})`);
    }
  }

  console.log(`资源站数据初始化完成: ${defaultSources.length} 个源`);
  await dataSource.destroy();
}

seedSources().catch((error) => {
  console.error('资源站数据初始化失败:', error);
  process.exit(1);
});

import { registerAs } from '@nestjs/config';

export const tmdbConfig = registerAs('tmdb', () => ({
  apiKey: process.env.TMDB_API_KEY || '',
  baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
  language: process.env.TMDB_LANGUAGE || 'zh-CN',
  fallbackLanguage: process.env.TMDB_FALLBACK_LANGUAGE || 'en-US',
  imageProxyEnabled: process.env.TMDB_IMAGE_PROXY_ENABLED !== 'false',
  imageCacheDir: process.env.TMDB_IMAGE_CACHE_DIR || './storage/tmdb-images',
  cacheTtl: parseInt(process.env.TMDB_CACHE_TTL || '86400', 10),
  requestTimeout: parseInt(process.env.TMDB_REQUEST_TIMEOUT || '10000', 10),
  maxConcurrentRequests: parseInt(process.env.TMDB_MAX_CONCURRENT || '5', 10),
  scrapeCron: process.env.TMDB_SCRAPE_CRON || '0 3 * * *',
  updateCron: process.env.TMDB_UPDATE_CRON || '0 4 * * *',
}));

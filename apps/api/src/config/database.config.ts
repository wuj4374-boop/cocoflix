import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  database: process.env.DB_PATH || (process.env.VERCEL ? '/tmp/cocoflix.db' : './data/cocoflix.db'),
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
}));

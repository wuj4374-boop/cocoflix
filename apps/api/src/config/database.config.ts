import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  database: process.env.DB_PATH || './data/cocoflix.db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
}));

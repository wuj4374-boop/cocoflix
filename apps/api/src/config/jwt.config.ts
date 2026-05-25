import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'cocoflix_jwt_secret_change_me',
  expiresIn: process.env.JWT_EXPIRATION || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
}));

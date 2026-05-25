import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { tmdbConfig } from './config/tmdb.config';
import { DatabaseConfigService } from './config/database-config.service';
import { WinstonLoggerModule } from './common/logger/winston-logger.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MediaModule } from './modules/media/media.module';
import { ProgressModule } from './modules/progress/progress.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { SearchModule } from './modules/search/search.module';
import { SourceModule } from './modules/source/source.module';
import { MetadataModule } from './modules/metadata/metadata.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, jwtConfig, tmdbConfig],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService,
    }),

    ScheduleModule.forRoot(),

    WinstonLoggerModule,

    HealthModule,
    AuthModule,
    UserModule,
    MediaModule,
    ProgressModule,
    FavoriteModule,
    SearchModule,
    SourceModule,
    MetadataModule,
  ],
})
export class AppModule {}

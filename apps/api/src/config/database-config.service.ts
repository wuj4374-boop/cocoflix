import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { User } from '../modules/user/entities/user.entity';
import { Favorite } from '../modules/favorite/entities/favorite.entity';
import { Episode } from '../modules/media/entities/episode.entity';
import { Genre } from '../modules/media/entities/genre.entity';
import { Media } from '../modules/media/entities/media.entity';
import { Season } from '../modules/media/entities/season.entity';
import { MediaCredit } from '../modules/metadata/entities/media-credit.entity';
import { MediaImage } from '../modules/metadata/entities/media-image.entity';
import { Progress } from '../modules/progress/entities/progress.entity';
import { SearchCache } from '../modules/source/entities/search-cache.entity';
import { Source } from '../modules/source/entities/source.entity';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbPath = this.configService.get<string>('database.database', './data/cocoflix.db');
    return {
      type: 'sqljs',
      entities: [
        User, Favorite, Episode, Genre, Media, Season,
        MediaCredit, MediaImage, Progress, SearchCache, Source,
      ],
      synchronize: this.configService.get<boolean>('database.synchronize'),
      logging: this.configService.get<boolean>('database.logging'),
      autoSave: true,
      location: dbPath,
    };
  }
}

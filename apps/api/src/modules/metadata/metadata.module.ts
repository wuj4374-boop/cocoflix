import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { TmdbService } from './services/tmdb.service';
import { MetadataScraperService } from './services/metadata-scraper.service';
import { MetadataScheduleService } from './services/metadata-schedule.service';
import { ImageProxyService } from './services/image-proxy.service';
import { MediaCredit } from './entities/media-credit.entity';
import { MediaImage } from './entities/media-image.entity';
import { Media } from '../media/entities/media.entity';
import { Season } from '../media/entities/season.entity';
import { Episode } from '../media/entities/episode.entity';
import { Genre } from '../media/entities/genre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, Season, Episode, Genre, MediaCredit, MediaImage]),
  ],
  controllers: [MetadataController],
  providers: [
    MetadataService,
    TmdbService,
    MetadataScraperService,
    MetadataScheduleService,
    ImageProxyService,
  ],
  exports: [MetadataService, TmdbService, ImageProxyService],
})
export class MetadataModule {}

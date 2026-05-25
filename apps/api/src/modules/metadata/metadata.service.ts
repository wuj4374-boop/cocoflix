import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TmdbService } from './services/tmdb.service';
import { MetadataScraperService } from './services/metadata-scraper.service';
import { Media } from '../media/entities/media.entity';
import { MetadataScrapeResult } from './types/tmdb.types';

@Injectable()
export class MetadataService {
  constructor(
    private readonly tmdbService: TmdbService,
    private readonly scraperService: MetadataScraperService,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async refreshMetadata(mediaId: string): Promise<MetadataScrapeResult> {
    return this.scraperService.scrapeMedia(mediaId);
  }

  async searchMetadata(query: string, type?: 'movie' | 'tv') {
    return this.scraperService.searchFromTmdb(query, type);
  }

  async getFullMetadata(mediaId: string) {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('媒体不存在');
    }

    const [credits, images, directors] = await Promise.all([
      this.scraperService.getMediaCredits(mediaId),
      this.scraperService.getMediaImages(mediaId),
      this.scraperService.getDirectors(mediaId),
    ]);

    return {
      media,
      credits,
      images,
      directors,
      tmdbMetadata: media.metadata || {},
    };
  }

  async getByTmdbId(tmdbId: number, type: 'movie' | 'tv' = 'movie') {
    let detail;
    if (type === 'movie') {
      detail = await this.tmdbService.getMovieDetail(tmdbId);
    } else {
      detail = await this.tmdbService.getTvDetail(tmdbId);
    }
    return detail;
  }
}

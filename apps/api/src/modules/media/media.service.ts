import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Media, MediaStatus } from './entities/media.entity';
import { Season } from './entities/season.entity';
import { Episode } from './entities/episode.entity';
import { CreateMediaDto } from './dto/create-media.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Season)
    private readonly seasonRepository: Repository<Season>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<Media>> {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.mediaRepository.findAndCount({
      where: { status: MediaStatus.ACTIVE },
      relations: ['genres'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: skip + items.length < total,
    };
  }

  async findById(id: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({
      where: { id },
      relations: ['genres', 'seasons'],
    });

    if (!media) {
      throw new NotFoundException('媒体不存在');
    }

    return media;
  }

  async findSeasons(mediaId: string): Promise<Season[]> {
    return this.seasonRepository.find({
      where: { mediaId },
      order: { number: 'ASC' },
    });
  }

  async findEpisodes(seasonId: string): Promise<Episode[]> {
    return this.episodeRepository.find({
      where: { seasonId },
      order: { number: 'ASC' },
    });
  }

  async findTrending(limit: number = 20): Promise<Media[]> {
    return this.mediaRepository.find({
      where: { status: MediaStatus.ACTIVE },
      order: { rating: 'DESC' },
      take: limit,
      relations: ['genres'],
    });
  }

  async findLatest(limit: number = 20): Promise<Media[]> {
    return this.mediaRepository.find({
      where: { status: MediaStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['genres'],
    });
  }

  async findByGenre(genre: string, query: PaginationDto): Promise<PaginatedResult<Media>> {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.mediaRepository
      .createQueryBuilder('media')
      .innerJoin('media.genres', 'genre', 'genre.slug = :genre', { genre })
      .where('media.status = :status', { status: MediaStatus.ACTIVE })
      .leftJoinAndSelect('media.genres', 'allGenres')
      .orderBy('media.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: skip + items.length < total,
    };
  }

  async create(createMediaDto: CreateMediaDto): Promise<Media> {
    const media = this.mediaRepository.create(createMediaDto);
    return this.mediaRepository.save(media);
  }
}

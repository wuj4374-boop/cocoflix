import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Media, MediaStatus } from '../media/entities/media.entity';
import { SearchQueryDto, SuggestQueryDto, SortBy } from './dto/search.dto';
import { SearchResult, SuggestResult, SearchHitItem } from './dto/search-response.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResult> {
    const startTime = Date.now();
    const { q, page = 1, pageSize = 20, type, genre, quality, minRating, sortBy } = query;

    const qb = this.mediaRepository.createQueryBuilder('media')
      .leftJoinAndSelect('media.genres', 'genres')
      .where('media.status = :status', { status: MediaStatus.ACTIVE });

    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      qb.andWhere(
        '(media.title LIKE :q OR media.originalTitle LIKE :q OR media.overview LIKE :q)',
        { q: searchTerm },
      );
    }

    if (type) {
      qb.andWhere('media.type = :type', { type });
    }

    if (genre) {
      qb.innerJoin('media.genres', 'filterGenre', 'filterGenre.slug = :genre', { genre });
    }

    if (quality) {
      qb.andWhere('media.quality = :quality', { quality });
    }

    if (minRating !== undefined) {
      qb.andWhere('media.rating >= :minRating', { minRating });
    }

    switch (sortBy) {
      case SortBy.RATING_DESC:
        qb.orderBy('media.rating', 'DESC');
        break;
      case SortBy.RELEASE_DATE_DESC:
        qb.orderBy('media.releaseDate', 'DESC');
        break;
      case SortBy.NEWEST:
        qb.orderBy('media.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('media.rating', 'DESC').addOrderBy('media.createdAt', 'DESC');
    }

    const skip = (page - 1) * pageSize;
    qb.skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.toSearchHitItem(item)),
      total,
      page,
      pageSize,
      hasMore: skip + items.length < total,
      searchAfter: null,
      took: Date.now() - startTime,
    };
  }

  async suggest(query: SuggestQueryDto): Promise<SuggestResult> {
    const startTime = Date.now();
    const { q, type, limit = 8 } = query;

    if (!q || !q.trim()) {
      return { suggestions: [], took: Date.now() - startTime };
    }

    const searchTerm = `%${q.trim()}%`;
    const qb = this.mediaRepository.createQueryBuilder('media')
      .where('media.status = :status', { status: MediaStatus.ACTIVE })
      .andWhere('(media.title LIKE :q OR media.originalTitle LIKE :q)', { q: searchTerm })
      .orderBy('media.rating', 'DESC')
      .take(limit);

    if (type) {
      qb.andWhere('media.type = :type', { type });
    }

    const items = await qb.getMany();

    return {
      suggestions: items.map((item) => ({
        text: item.title,
        type: item.type,
        posterUrl: item.posterUrl,
        id: item.id,
      })),
      took: Date.now() - startTime,
    };
  }

  async findSimilar(mediaId: string, limit: number = 6): Promise<{ items: SearchHitItem[]; took: number }> {
    const startTime = Date.now();

    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
      relations: ['genres'],
    });

    if (!media) {
      return { items: [], took: Date.now() - startTime };
    }

    const genreSlugs = media.genres?.map((g) => g.slug) || [];

    let items: Media[];
    if (genreSlugs.length > 0) {
      items = await this.mediaRepository
        .createQueryBuilder('media')
        .leftJoinAndSelect('media.genres', 'genres')
        .where('media.status = :status', { status: MediaStatus.ACTIVE })
        .andWhere('media.id != :mediaId', { mediaId })
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('mg.media_id')
            .from('media_genres', 'mg')
            .innerJoin('genres', 'g', 'g.id = mg.genre_id')
            .where('g.slug IN (:...genreSlugs)')
            .getQuery();
          return `media.id IN ${subQuery}`;
        })
        .setParameter('genreSlugs', genreSlugs)
        .orderBy('media.rating', 'DESC')
        .take(limit)
        .getMany();
    } else {
      items = await this.mediaRepository.find({
        where: { status: MediaStatus.ACTIVE },
        relations: ['genres'],
        order: { rating: 'DESC' },
        take: limit,
      });
    }

    return {
      items: items.map((item) => this.toSearchHitItem(item)),
      took: Date.now() - startTime,
    };
  }

  private toSearchHitItem(media: Media): SearchHitItem {
    return {
      id: media.id,
      title: media.title,
      originalTitle: media.originalTitle,
      type: media.type,
      overview: media.overview,
      posterUrl: media.posterUrl,
      backdropUrl: media.backdropUrl,
      rating: media.rating,
      releaseDate: media.releaseDate ? String(media.releaseDate) : null,
      quality: media.quality,
      genres: (media.genres || []).map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
      })),
      cast: [],
      isHDR: false,
      hasChineseSubtitle: false,
      sourceCodec: null,
      score: 0,
      highlight: {},
    };
  }
}

// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { TmdbService } from './tmdb.service';
import { ImageProxyService } from './image-proxy.service';
import { Media, MediaType } from '../../media/entities/media.entity';
import { Season } from '../../media/entities/season.entity';
import { Episode } from '../../media/entities/episode.entity';
import { Genre } from '../../media/entities/genre.entity';
import { MediaCredit, CreditType } from '../entities/media-credit.entity';
import { MediaImage, ImageType } from '../entities/media-image.entity';
import {
  TmdbMovieDetail,
  TmdbTvDetail,
  TmdbCastMember,
  TmdbCrewMember,
  TmdbImage,
  MetadataScrapeResult,
} from '../types/tmdb.types';

@Injectable()
export class MetadataScraperService {
  private readonly logger = new Logger(MetadataScraperService.name);

  constructor(
    private readonly tmdbService: TmdbService,
    private readonly imageProxyService: ImageProxyService,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(Season)
    private readonly seasonRepository: Repository<Season>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(MediaCredit)
    private readonly creditRepository: Repository<MediaCredit>,
    @InjectRepository(MediaImage)
    private readonly imageRepository: Repository<MediaImage>,
  ) {}

  // ============ 单个媒体刮削 ============

  async scrapeMedia(mediaId: string): Promise<MetadataScrapeResult> {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    if (!media) {
      return {
        mediaId,
        tmdbId: 0,
        mediaType: 'movie',
        success: false,
        message: '媒体不存在',
        updatedAt: new Date(),
      };
    }

    if (!media.tmdbId) {
      const matched = await this.autoMatchTmdb(media);
      if (!matched) {
        return {
          mediaId,
          tmdbId: 0,
          mediaType: 'movie',
          success: false,
          message: '无法自动匹配 TMDB',
          updatedAt: new Date(),
        };
      }
    }

    const isTv = media.type === MediaType.TV || media.type === MediaType.ANIME || media.type === MediaType.VARIETY;
    try {
      if (isTv) {
        return await this.scrapeTvMedia(media);
      }
      return await this.scrapeMovieMedia(media);
    } catch (error) {
      this.logger.error(`刮削失败 [${mediaId}]: ${(error as Error).message}`);
      return {
        mediaId,
        tmdbId: media.tmdbId,
        mediaType: isTv ? 'tv' : 'movie',
        success: false,
        message: `刮削失败: ${(error as Error).message}`,
        updatedAt: new Date(),
      };
    }
  }

  private async scrapeMovieMedia(media: Media): Promise<MetadataScrapeResult> {
    const tmdbId = media.tmdbId;

    const detail = await this.tmdbService.getMovieDetail(tmdbId);

    // 更新媒体基本信息
    media.title = detail.title || media.title;
    media.originalTitle = detail.original_title || media.originalTitle;
    media.overview = detail.overview || media.overview;
    media.rating = detail.vote_average || media.rating;
    media.posterUrl = this.imageProxyService.getProxyPosterUrl(detail.poster_path) || media.posterUrl;
    media.backdropUrl = this.imageProxyService.getProxyBackdropUrl(detail.backdrop_path) || media.backdropUrl;

    if (detail.release_date) {
      media.releaseDate = new Date(detail.release_date);
    }

    // 扩展元数据存入 metadata JSONB
    const tmdbMetadata: Record<string, unknown> = {
      ...(media.metadata || {}),
      tagline: detail.tagline,
      runtime: detail.runtime,
      budget: detail.budget,
      revenue: detail.revenue,
      status: detail.status,
      homepage: detail.homepage,
      popularity: detail.popularity,
      voteCount: detail.vote_count,
      productionCompanies: detail.production_companies?.map((c) => ({
        id: c.id,
        name: c.name,
        originCountry: c.origin_country,
      })),
      productionCountries: detail.production_countries?.map((c) => c.name),
      spokenLanguages: detail.spoken_languages?.map((l) => ({
        iso: l.iso_639_1,
        name: l.name || l.english_name,
      })),
      keywords: detail.keywords?.keywords?.map((k) => k.name) || [],
      lastScrapedAt: new Date().toISOString(),
    };

    if (!media.imdbId && detail.imdb_id) {
      media.imdbId = detail.imdb_id;
    }

    media.metadata = tmdbMetadata;
    await this.mediaRepository.save(media);

    // 同步分类
    await this.syncGenres(media, detail.genres?.map((g) => g.name) || []);

    // 同步演员/导演
    if (detail.credits) {
      await this.syncCredits(media.id, tmdbId, 'movie', detail.credits.cast, detail.credits.crew);
    }

    // 同步图片
    if (detail.images) {
      await this.syncImages(media.id, tmdbId, 'movie', detail.images);
    }

    // 下载海报和背景图
    if (detail.poster_path) {
      await this.imageProxyService.downloadImage(detail.poster_path, 'w500', 'poster');
    }
    if (detail.backdrop_path) {
      await this.imageProxyService.downloadImage(detail.backdrop_path, 'w1280', 'backdrop');
    }

    this.logger.log(`电影元数据刮削完成: ${media.title} (TMDB: ${tmdbId})`);
    return {
      mediaId: media.id,
      tmdbId,
      mediaType: 'movie',
      success: true,
      message: '电影元数据刮削成功',
      updatedAt: new Date(),
    };
  }

  private async scrapeTvMedia(media: Media): Promise<MetadataScrapeResult> {
    const tmdbId = media.tmdbId;

    const detail = await this.tmdbService.getTvDetail(tmdbId);

    // 更新媒体基本信息
    media.title = detail.name || media.title;
    media.originalTitle = detail.original_name || media.originalTitle;
    media.overview = detail.overview || media.overview;
    media.rating = detail.vote_average || media.rating;
    media.posterUrl = this.imageProxyService.getProxyPosterUrl(detail.poster_path) || media.posterUrl;
    media.backdropUrl = this.imageProxyService.getProxyBackdropUrl(detail.backdrop_path) || media.backdropUrl;

    if (detail.first_air_date) {
      media.releaseDate = new Date(detail.first_air_date);
    }

    // 扩展元数据
    const tmdbMetadata: Record<string, unknown> = {
      ...(media.metadata || {}),
      tagline: detail.tagline,
      numberOfSeasons: detail.number_of_seasons,
      numberOfEpisodes: detail.number_of_episodes,
      episodeRunTime: detail.episode_run_time,
      status: detail.status,
      homepage: detail.homepage,
      popularity: detail.popularity,
      voteCount: detail.vote_count,
      inProduction: detail.in_production,
      type: detail.type,
      lastAirDate: detail.last_air_date,
      networks: detail.networks?.map((n) => ({
        id: n.id,
        name: n.name,
        originCountry: n.origin_country,
      })),
      createdBy: detail.created_by?.map((c) => ({
        id: c.id,
        name: c.name,
      })),
      productionCompanies: detail.production_companies?.map((c) => ({
        id: c.id,
        name: c.name,
        originCountry: c.origin_country,
      })),
      productionCountries: detail.production_countries?.map((c) => c.name),
      spokenLanguages: detail.spoken_languages?.map((l) => ({
        iso: l.iso_639_1,
        name: l.name || l.english_name,
      })),
      keywords: detail.keywords?.results?.map((k) => k.name) || detail.keywords?.keywords?.map((k) => k.name) || [],
      lastScrapedAt: new Date().toISOString(),
    };

    media.metadata = tmdbMetadata;
    await this.mediaRepository.save(media);

    // 同步分类
    await this.syncGenres(media, detail.genres?.map((g) => g.name) || []);

    // 同步季信息
    await this.syncSeasons(media.id, tmdbId, detail.seasons || []);

    // 同步演员/导演
    if (detail.credits) {
      await this.syncCredits(media.id, tmdbId, 'tv', detail.credits.cast, detail.credits.crew);
    }

    // 同步图片
    if (detail.images) {
      await this.syncImages(media.id, tmdbId, 'tv', detail.images);
    }

    // 下载海报和背景图
    if (detail.poster_path) {
      await this.imageProxyService.downloadImage(detail.poster_path, 'w500', 'poster');
    }
    if (detail.backdrop_path) {
      await this.imageProxyService.downloadImage(detail.backdrop_path, 'w1280', 'backdrop');
    }

    this.logger.log(`剧集元数据刮削完成: ${media.title} (TMDB: ${tmdbId})`);
    return {
      mediaId: media.id,
      tmdbId,
      mediaType: 'tv',
      success: true,
      message: '剧集元数据刮削成功',
      updatedAt: new Date(),
    };
  }

  // ============ 自动匹配TMDB ============

  async autoMatchTmdb(media: Media): Promise<boolean> {
    if (media.tmdbId) return true;

    // 尝试通过IMDB ID查找
    if (media.imdbId) {
      try {
        const result = await this.tmdbService.findByImdbId(media.imdbId);
        if (result.movie_results.length > 0) {
          media.tmdbId = result.movie_results[0].id;
          await this.mediaRepository.save(media);
          return true;
        }
        if (result.tv_results.length > 0) {
          media.tmdbId = result.tv_results[0].id;
          await this.mediaRepository.save(media);
          return true;
        }
      } catch (error) {
        this.logger.warn(`通过IMDB ID匹配失败: ${media.imdbId}`);
      }
    }

    // 通过标题搜索匹配
    try {
      const isTv = media.type === MediaType.TV || media.type === MediaType.ANIME || media.type === MediaType.VARIETY;
      const searchResult = isTv
        ? await this.tmdbService.searchTv(media.title)
        : await this.tmdbService.searchMovie(media.title);

      if (searchResult.results.length > 0) {
        const bestMatch = this.findBestMatch(media, searchResult.results);
        if (bestMatch) {
          media.tmdbId = bestMatch.id;
          await this.mediaRepository.save(media);
          this.logger.log(`自动匹配成功: ${media.title} -> TMDB ${bestMatch.id}`);
          return true;
        }
      }
    } catch (error) {
      this.logger.error(`标题搜索匹配失败 [${media.title}]: ${(error as Error).message}`);
    }

    return false;
  }

  private findBestMatch(
    media: Media,
    candidates: Array<{ id: number; title?: string; name?: string; release_date?: string; first_air_date?: string; vote_average: number }>,
  ): typeof candidates[0] | null {
    if (candidates.length === 0) return null;

    const normalizedTitle = normalizeTitle(media.title);

    for (const candidate of candidates) {
      const candidateTitle = normalizeTitle(candidate.title || candidate.name || '');
      if (candidateTitle === normalizedTitle) {
        return candidate;
      }
    }

    // 如果没有精确匹配，用年份+相似度
    for (const candidate of candidates) {
      const candidateTitle = candidate.title || candidate.name || '';
      const candidateDate = candidate.release_date || candidate.first_air_date;
      const similarity = calculateSimilarity(normalizedTitle, normalizeTitle(candidateTitle));

      if (similarity > 0.6) {
        if (media.releaseDate && candidateDate) {
          const mediaYear = new Date(media.releaseDate).getFullYear();
          const candidateYear = new Date(candidateDate).getFullYear();
          if (Math.abs(mediaYear - candidateYear) <= 1) {
            return candidate;
          }
        } else if (similarity > 0.8) {
          return candidate;
        }
      }
    }

    // 评分最高的作为最后兜底
    return candidates[0];
  }

  // ============ 数据同步辅助方法 ============

  private async syncGenres(media: Media, genreNames: string[]): Promise<void> {
    if (genreNames.length === 0) return;

    const genres: Genre[] = [];
    for (const name of genreNames) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      let genre = await this.genreRepository.findOne({ where: { slug } });
      if (!genre) {
        genre = this.genreRepository.create({ name, slug });
        genre = await this.genreRepository.save(genre);
      }
      genres.push(genre);
    }

    media.genres = genres;
    await this.mediaRepository.save(media);
  }

  private async syncCredits(
    mediaId: string,
    tmdbId: number,
    type: string,
    cast: TmdbCastMember[],
    crew: TmdbCrewMember[],
  ): Promise<void> {
    // 清除旧数据
    await this.creditRepository.delete({ mediaId });

    const credits: Partial<MediaCredit>[] = [];

    // 演员 (最多20人)
    for (const member of cast.slice(0, 20)) {
      credits.push({
        mediaId,
        tmdbPersonId: member.id,
        type: CreditType.CAST,
        name: member.name,
        originalName: member.original_name,
        profilePath: this.imageProxyService.getProxyProfileUrl(member.profile_path),
        character: member.character,
        order: member.order,
        gender: member.gender,
        popularity: member.popularity,
      });
    }

    // 导演、编剧等关键剧组成员
    const keyJobs = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 'Creator'];
    const keyCrew = crew.filter((m) => keyJobs.includes(m.job));
    for (const member of keyCrew) {
      credits.push({
        mediaId,
        tmdbPersonId: member.id,
        type: CreditType.CREW,
        name: member.name,
        originalName: member.original_name,
        profilePath: this.imageProxyService.getProxyProfileUrl(member.profile_path),
        job: member.job,
        department: member.department,
        gender: member.gender,
        popularity: member.popularity,
      });
    }

    if (credits.length > 0) {
      await this.creditRepository.save(this.creditRepository.create(credits));
    }
  }

  private async syncImages(
    mediaId: string,
    tmdbId: number,
    type: string,
    images: { backdrops: TmdbImage[]; posters: TmdbImage[] },
  ): Promise<void> {
    // 清除旧数据
    await this.imageRepository.delete({ mediaId });

    const imageRecords: Partial<MediaImage>[] = [];

    // 背景图 (最多10张)
    for (const img of images.backdrops.slice(0, 10)) {
      imageRecords.push({
        mediaId,
        type: ImageType.BACKDROP,
        tmdbPath: img.file_path,
        localPath: this.imageProxyService.getProxyBackdropUrl(img.file_path),
        iso6391: img.iso_639_1,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspect_ratio,
        voteAverage: img.vote_average,
        voteCount: img.vote_count,
      });
    }

    // 海报 (最多10张)
    for (const img of images.posters.slice(0, 10)) {
      imageRecords.push({
        mediaId,
        type: ImageType.POSTER,
        tmdbPath: img.file_path,
        localPath: this.imageProxyService.getProxyPosterUrl(img.file_path) || undefined,
        iso6391: img.iso_639_1 || undefined,
        width: img.width,
        height: img.height,
        aspectRatio: img.aspect_ratio,
        voteAverage: img.vote_average,
        voteCount: img.vote_count,
      } as Partial<MediaImage>);
    }

    if (imageRecords.length > 0) {
      await this.imageRepository.save(this.imageRepository.create(imageRecords));
    }
  }

  private async syncSeasons(mediaId: string, tmdbId: number, seasons: TmdbTvDetail['seasons']): Promise<void> {
    for (const seasonData of seasons) {
      if (seasonData.season_number === 0) continue; // 跳过特别篇

      let season = await this.seasonRepository.findOne({
        where: { mediaId, number: seasonData.season_number },
      });

      if (!season) {
        season = this.seasonRepository.create({
          mediaId,
          number: seasonData.season_number,
          name: seasonData.name,
          overview: seasonData.overview,
          posterUrl: this.imageProxyService.getProxyPosterUrl(seasonData.poster_path) || undefined,
          airDate: seasonData.air_date ? new Date(seasonData.air_date) : undefined,
        } as any);
      } else {
        season.name = seasonData.name || season.name;
        season.overview = seasonData.overview || season.overview;
        season.posterUrl = this.imageProxyService.getProxyPosterUrl(seasonData.poster_path) || season.posterUrl;
        if (seasonData.air_date) {
          season.airDate = new Date(seasonData.air_date);
        }
      }

      season = await this.seasonRepository.save(season);

      // 获取并同步该季的剧集详情
      try {
        const seasonDetail = await this.tmdbService.getSeasonDetail(tmdbId, seasonData.season_number);
        await this.syncEpisodes(season.id, seasonDetail.episodes);
      } catch (error) {
        this.logger.warn(
          `获取季详情失败: TMDB ${tmdbId} S${seasonData.season_number}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async syncEpisodes(
    seasonId: string,
    episodes: Array<{ episode_number: number; name: string; overview: string; still_path: string | null; air_date: string; runtime: number | null }>,
  ): Promise<void> {
    for (const epData of episodes) {
      let episode = await this.episodeRepository.findOne({
        where: { seasonId, number: epData.episode_number },
      });

      if (!episode) {
        episode = this.episodeRepository.create({
          seasonId,
          number: epData.episode_number,
          title: epData.name,
          overview: epData.overview,
          thumbnailUrl: this.imageProxyService.getProxyStillUrl(epData.still_path) || undefined,
          airDate: epData.air_date ? new Date(epData.air_date) : undefined,
          duration: epData.runtime || undefined,
        } as any);
      } else {
        episode.title = epData.name || episode.title;
        episode.overview = epData.overview || episode.overview;
        episode.thumbnailUrl = this.imageProxyService.getProxyStillUrl(epData.still_path) || episode.thumbnailUrl;
        if (epData.air_date) {
          episode.airDate = new Date(epData.air_date);
        }
        if (epData.runtime) {
          episode.duration = epData.runtime;
        }
      }

      await this.episodeRepository.save(episode);
    }
  }

  // ============ 批量刮削 ============

  async scrapeAll(limit = 50): Promise<MetadataScrapeResult[]> {
    const mediaList = await this.mediaRepository.find({
      where: { tmdbId: In([0]) },
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // 也包括有tmdbId但超过7天未更新的
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const staleMedia = await this.mediaRepository
      .createQueryBuilder('media')
      .where('media.tmdb_id IS NOT NULL AND media.tmdb_id > 0')
      .andWhere("(json_extract(media.metadata, '$.lastScrapedAt') IS NULL OR json_extract(media.metadata, '$.lastScrapedAt') < :sevenDaysAgo)", { sevenDaysAgo })
      .orderBy('media.updated_at', 'ASC')
      .take(limit)
      .getMany();

    const allMedia = [...mediaList, ...staleMedia];
    const results: MetadataScrapeResult[] = [];

    for (const media of allMedia) {
      const result = await this.scrapeMedia(media.id);
      results.push(result);

      // 限制请求频率，避免触发TMDB速率限制
      await delay(250);
    }

    return results;
  }

  // ============ 元数据搜索 ============

  async searchFromTmdb(query: string, type?: 'movie' | 'tv') {
    let result;
    if (type === 'movie') {
      result = await this.tmdbService.searchMovie(query);
    } else if (type === 'tv') {
      result = await this.tmdbService.searchTv(query);
    } else {
      result = await this.tmdbService.searchMulti(query);
    }

    return result.results
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || !item.media_type)
      .map((item) => ({
        tmdbId: item.id,
        mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
        title: item.title || item.name,
        originalTitle: item.original_title || item.original_name,
        overview: item.overview,
        posterUrl: this.imageProxyService.getProxyPosterUrl(item.poster_path),
        backdropUrl: this.imageProxyService.getProxyBackdropUrl(item.backdrop_path),
        releaseDate: item.release_date || item.first_air_date,
        rating: item.vote_average,
        popularity: item.popularity,
      }));
  }

  // ============ 获取已刮削的详情 ============

  async getMediaCredits(mediaId: string): Promise<MediaCredit[]> {
    return this.creditRepository.find({
      where: { mediaId },
      order: { type: 'ASC', order: 'ASC' },
    });
  }

  async getMediaImages(mediaId: string): Promise<MediaImage[]> {
    return this.imageRepository.find({
      where: { mediaId },
      order: { type: 'ASC', voteAverage: 'DESC' },
    });
  }

  async getDirectors(mediaId: string): Promise<MediaCredit[]> {
    return this.creditRepository.find({
      where: { mediaId, type: CreditType.CREW, job: 'Director' },
    });
  }
}

// ============ 工具函数 ============

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\-_:：·.]+/g, '')
    .replace(/[^\w一-鿿]/g, '')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.includes(shorter)) return shorter.length / longer.length;

  let matches = 0;
  const shorterChars = shorter.split('');
  for (const char of shorterChars) {
    if (longer.includes(char)) matches++;
  }

  return matches / longer.length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import {
  TmdbSearchResult,
  TmdbMovieDetail,
  TmdbTvDetail,
  TmdbSeasonDetail,
  TmdbGenreList,
  TmdbFindResult,
  TmdbConfig,
  TmdbCredits,
  TmdbImages,
} from '../types/tmdb.types';

@Injectable()
export class TmdbService implements OnModuleInit {
  private readonly logger = new Logger(TmdbService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly language: string;
  private readonly fallbackLanguage: string;
  private readonly requestTimeout: number;
  private httpClient: AxiosInstance;
  private tmdbConfig: TmdbConfig | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('tmdb.apiKey', '');
    this.baseUrl = this.configService.get<string>('tmdb.baseUrl', 'https://api.themoviedb.org/3');
    this.language = this.configService.get<string>('tmdb.language', 'zh-CN');
    this.fallbackLanguage = this.configService.get<string>('tmdb.fallbackLanguage', 'en-US');
    this.requestTimeout = this.configService.get<number>('tmdb.requestTimeout', 10000);
  }

  onModuleInit(): void {
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.requestTimeout,
      params: { api_key: this.apiKey },
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          this.logger.error(
            `TMDB API 错误: ${error.response.status} - ${error.config?.url}`,
          );
        } else if (error.request) {
          this.logger.error(`TMDB API 请求超时: ${error.config?.url}`);
        }
        return Promise.reject(error);
      },
    );

    if (this.apiKey) {
      this.logger.log('TMDB API 服务已初始化');
    } else {
      this.logger.warn('TMDB API Key 未配置，元数据功能将不可用');
    }
  }

  async getConfig(): Promise<TmdbConfig> {
    if (this.tmdbConfig) {
      return this.tmdbConfig;
    }
    const { data } = await this.httpClient.get<TmdbConfig>('/configuration');
    this.tmdbConfig = data;
    return data;
  }

  // ============ 搜索 ============

  async searchMulti(query: string, page = 1): Promise<TmdbSearchResult> {
    const { data } = await this.httpClient.get<TmdbSearchResult>('/search/multi', {
      params: { query, page, language: this.language },
    });
    return data;
  }

  async searchMovie(query: string, page = 1, year?: number): Promise<TmdbSearchResult> {
    const params: Record<string, unknown> = { query, page, language: this.language };
    if (year) params.year = year;
    const { data } = await this.httpClient.get<TmdbSearchResult>('/search/movie', { params });
    return data;
  }

  async searchTv(query: string, page = 1, firstAirDateYear?: number): Promise<TmdbSearchResult> {
    const params: Record<string, unknown> = { query, page, language: this.language };
    if (firstAirDateYear) params.first_air_date_year = firstAirDateYear;
    const { data } = await this.httpClient.get<TmdbSearchResult>('/search/tv', { params });
    return data;
  }

  // ============ 详情 ============

  async getMovieDetail(tmdbId: number, appendToResponse = 'videos,credits,images,similar,keywords'): Promise<TmdbMovieDetail> {
    const { data } = await this.httpClient.get<TmdbMovieDetail>(`/movie/${tmdbId}`, {
      params: { language: this.language, append_to_response: appendToResponse },
    });
    return data;
  }

  async getMovieDetailEn(tmdbId: number): Promise<TmdbMovieDetail> {
    const { data } = await this.httpClient.get<TmdbMovieDetail>(`/movie/${tmdbId}`, {
      params: { language: this.fallbackLanguage },
    });
    return data;
  }

  async getTvDetail(tmdbId: number, appendToResponse = 'videos,credits,images,similar,keywords'): Promise<TmdbTvDetail> {
    const { data } = await this.httpClient.get<TmdbTvDetail>(`/tv/${tmdbId}`, {
      params: { language: this.language, append_to_response: appendToResponse },
    });
    return data;
  }

  async getTvDetailEn(tmdbId: number): Promise<TmdbTvDetail> {
    const { data } = await this.httpClient.get<TmdbTvDetail>(`/tv/${tmdbId}`, {
      params: { language: this.fallbackLanguage },
    });
    return data;
  }

  async getSeasonDetail(tmdbId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
    const { data } = await this.httpClient.get<TmdbSeasonDetail>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
      { params: { language: this.language } },
    );
    return data;
  }

  async getMovieCredits(tmdbId: number): Promise<TmdbCredits> {
    const { data } = await this.httpClient.get<TmdbCredits>(`/movie/${tmdbId}/credits`);
    return data;
  }

  async getTvCredits(tmdbId: number): Promise<TmdbCredits> {
    const { data } = await this.httpClient.get<TmdbCredits>(`/tv/${tmdbId}/credits`);
    return data;
  }

  async getMovieImages(tmdbId: number): Promise<TmdbImages> {
    const { data } = await this.httpClient.get<TmdbImages>(`/movie/${tmdbId}/images`);
    return data;
  }

  async getTvImages(tmdbId: number): Promise<TmdbImages> {
    const { data } = await this.httpClient.get<TmdbImages>(`/tv/${tmdbId}/images`);
    return data;
  }

  // ============ 分类 ============

  async getMovieGenres(): Promise<TmdbGenreList> {
    const { data } = await this.httpClient.get<TmdbGenreList>('/genre/movie/list', {
      params: { language: this.language },
    });
    return data;
  }

  async getTvGenres(): Promise<TmdbGenreList> {
    const { data } = await this.httpClient.get<TmdbGenreList>('/genre/tv/list', {
      params: { language: this.language },
    });
    return data;
  }

  // ============ 热门/趋势 ============

  async getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<TmdbSearchResult> {
    const { data } = await this.httpClient.get<TmdbSearchResult>(
      `/trending/${mediaType}/${timeWindow}`,
      { params: { language: this.language } },
    );
    return data;
  }

  async getPopularMovies(page = 1): Promise<TmdbSearchResult> {
    const { data } = await this.httpClient.get<TmdbSearchResult>('/movie/popular', {
      params: { page, language: this.language },
    });
    return data;
  }

  async getPopularTv(page = 1): Promise<TmdbSearchResult> {
    const { data } = await this.httpClient.get<TmdbSearchResult>('/tv/popular', {
      params: { page, language: this.language },
    });
    return data;
  }

  // ============ 外部ID查找 ============

  async findByImdbId(imdbId: string): Promise<TmdbFindResult> {
    const { data } = await this.httpClient.get<TmdbFindResult>(`/find/${imdbId}`, {
      params: { external_source: 'imdb_id', language: this.language },
    });
    return data;
  }

  // ============ 图片URL构建 ============

  getImageUrl(path: string, size: string = 'w500'): string {
    const imageBaseUrl = this.configService.get<string>(
      'tmdb.imageBaseUrl',
      'https://image.tmdb.org/t/p',
    );
    return `${imageBaseUrl}/${size}${path}`;
  }

  getPosterUrl(path: string | null, size: string = 'w500'): string | null {
    return path ? this.getImageUrl(path, size) : null;
  }

  getBackdropUrl(path: string | null, size: string = 'w1280'): string | null {
    return path ? this.getImageUrl(path, size) : null;
  }

  getProfileUrl(path: string | null, size: string = 'w185'): string | null {
    return path ? this.getImageUrl(path, size) : null;
  }
}

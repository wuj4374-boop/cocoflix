// 前后端共享类型定义

// ============ 媒体类型 ============
export type MediaType = 'movie' | 'tv' | 'anime' | 'variety';
export type MediaStatus = 'active' | 'processing' | 'unavailable';

export interface Media {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  releaseDate?: string;
  status: MediaStatus;
  quality?: string;
  duration?: number;
  fileSize?: number;
  tmdbId?: number;
  imdbId?: string;
  doubanId?: string;
  genres?: Genre[];
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  id: string;
  mediaId: string;
  number: number;
  name?: string;
  overview?: string;
  posterUrl?: string;
  airDate?: string;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  seasonId: string;
  number: number;
  title?: string;
  overview?: string;
  duration?: number;
  airDate?: string;
  hlsPath?: string;
  thumbnailUrl?: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

// ============ 元数据/演员/图片类型 ============
export type CreditType = 'cast' | 'crew';

export interface MediaCredit {
  id: string;
  mediaId: string;
  tmdbPersonId: number;
  type: CreditType;
  name: string;
  originalName?: string;
  profilePath?: string;
  character?: string;
  job?: string;
  department?: string;
  order: number;
  gender?: number;
  popularity?: number;
}

export type ImageType = 'poster' | 'backdrop' | 'still' | 'logo';

export interface MediaImage {
  id: string;
  mediaId: string;
  type: ImageType;
  tmdbPath: string;
  localPath?: string;
  iso6391?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  voteAverage?: number;
  voteCount?: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface TmdbSearchResult {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  rating: number;
  popularity: number;
}

export interface MediaFullMetadata {
  media: Media;
  credits: MediaCredit[];
  images: MediaImage[];
  directors: MediaCredit[];
  tmdbMetadata: Record<string, unknown>;
}

// ============ 用户类型 ============
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: Record<string, unknown>;
  createdAt: string;
}

// ============ 进度类型 ============
export interface Progress {
  id: string;
  userId: string;
  mediaId: string;
  episodeId?: string;
  progress: number;
  duration: number;
  lastWatch: string;
  completed: boolean;
  media?: Media;
  episode?: Episode;
}

// ============ 收藏类型 ============
export interface Favorite {
  id: string;
  userId: string;
  mediaId: string;
  createdAt: string;
  media?: Media;
}

// ============ API 响应类型 ============
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

// ============ 错误码 ============
export const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 40000,
  UNAUTHORIZED: 40001,
  FORBIDDEN: 40003,
  NOT_FOUND: 40004,
  RATE_LIMIT: 40005,
  SERVER_ERROR: 50000,
  AUTH_LOGIN_FAILED: 40101,
  AUTH_TOKEN_EXPIRED: 40102,
  AUTH_TOKEN_INVALID: 40103,
  MEDIA_NOT_FOUND: 40401,
  MEDIA_NOT_TRANSCODED: 40402,
  MEDIA_INVALID_URL: 40403,
  TRANSCODE_NOT_FOUND: 40501,
  TRANSCODE_FAILED: 40502,
  TRANSCODE_GPU_UNAVAILABLE: 40503,
} as const;

// ============ 转码类型 ============
export type TranscodeStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TranscodeJob {
  id: string;
  mediaId?: string;
  episodeId?: string;
  status: TranscodeStatus;
  progress: number;
  quality?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ============ 播放器类型 ============
export interface QualityOption {
  label: string;
  value: string;
  width: number;
  height: number;
  bitrate: number;
}

export const QUALITY_PRESETS: Record<string, QualityOption> = {
  '4k': { label: '4K', value: '4k', width: 3840, height: 2160, bitrate: 20000000 },
  '1080p': { label: '1080P', value: '1080p', width: 1920, height: 1080, bitrate: 8000000 },
  '720p': { label: '720P', value: '720p', width: 1280, height: 720, bitrate: 4000000 },
  '480p': { label: '480P', value: '480p', width: 854, height: 480, bitrate: 2000000 },
};

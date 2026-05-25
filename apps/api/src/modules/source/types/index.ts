export enum SourceType {
  M3U8 = 'm3u8',
  CLOUD = 'cloud',
  ANIME = 'anime',
  OVERSEAS = 'overseas',
  CUSTOM = 'custom',
}

export enum VideoQuality {
  UHD_4K = '4K',
  Q_2K = '2K',
  FHD_1080P = '1080P',
  HD_720P = '720P',
  SD_480P = '480P',
  UNKNOWN = 'unknown',
}

export enum VideoCodec {
  H265 = 'H.265',
  HEVC = 'HEVC',
  H264 = 'H.264',
  AV1 = 'AV1',
  VP9 = 'VP9',
  UNKNOWN = 'unknown',
}

export enum AudioCodec {
  DOLBY_ATMOS = 'Dolby Atmos',
  DOLBY_DIGITAL = 'Dolby Digital',
  DTS = 'DTS',
  AAC = 'AAC',
  MP3 = 'MP3',
  FLAC = 'FLAC',
  UNKNOWN = 'unknown',
}

export enum HDRType {
  HDR10_PLUS = 'HDR10+',
  HDR10 = 'HDR10',
  DOLBY_VISION = 'Dolby Vision',
  HLG = 'HLG',
  NONE = 'none',
}

export interface VideoQualityInfo {
  resolution: VideoQuality;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  hdr: HDRType;
  bitrate?: number;
  fileSize?: string;
  source?: string;
}

export interface EpisodeInfo {
  episodeNumber: number;
  title?: string;
  playUrl: string;
  duration?: number;
  quality?: VideoQualityInfo;
  subtitle?: string;
}

export interface SeasonInfo {
  seasonNumber: number;
  title?: string;
  episodes: EpisodeInfo[];
}

export interface SearchResult {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  description?: string;
  genres?: string[];
  actors?: string[];
  directors?: string[];
  rating?: number;
  quality: VideoQualityInfo;
  playUrl: string;
  episodes?: EpisodeInfo[];
  seasons?: SeasonInfo[];
  isSeries: boolean;
  updateTime?: string;
  raw?: Record<string, unknown>;
}

export interface AggregatedResult {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  description?: string;
  genres?: string[];
  actors?: string[];
  directors?: string[];
  rating?: number;
  isSeries: boolean;
  sources: AggregatedSource[];
  bestQuality: VideoQualityInfo;
  totalSources: number;
  episodes?: AggregatedEpisode[];
  score: number;
}

export interface AggregatedSource {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  quality: VideoQualityInfo;
  playUrl: string;
  updateTime?: string;
  reliability: number;
}

export interface AggregatedEpisode {
  episodeNumber: number;
  title?: string;
  sources: AggregatedSource[];
  bestQuality: VideoQualityInfo;
}

export interface SearchQuery {
  keyword: string;
  type?: SourceType;
  quality?: VideoQuality;
  isSeries?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdapterCapabilities {
  supportsSearch: boolean;
  supportsDetail: boolean;
  supportsEpisode: boolean;
  supportsQualityFilter: boolean;
  maxConcurrent: number;
  rateLimit: number;
  avgResponseTime: number;
}

export interface AdapterHealth {
  isHealthy: boolean;
  successRate: number;
  avgResponseTime: number;
  lastCheck: number;
  consecutiveFailures: number;
  circuitState: CircuitState;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenMaxAttempts: number;
}

export interface SearchStats {
  totalSources: number;
  successSources: number;
  failedSources: number;
  timeoutSources: number;
  totalTime: number;
  cachedSources: number;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  retryCount: number;
  config: Record<string, unknown>;
}

export interface XmlApiResponse {
  list: {
    video: XmlVideoItem[];
    _$?: { count: number; pages: number; page: number };
  };
}

export interface XmlVideoItem {
  tid: number;
  type: string;
  name: string;
  dt: string;
  des?: string;
  pic?: string;
  year?: string;
  area?: string;
  lang?: string;
  remark?: string;
  play_url?: string;
  id: number;
  actor?: string;
  director?: string;
  dl?: {
    dd: XmlEpisodeList[];
  };
}

export interface XmlEpisodeList {
  _flag: string;
  _: string;
}

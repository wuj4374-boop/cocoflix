// ============ 视频源质量信息 ============
export interface VideoQualityInfo {
  resolution: string;
  codec: string;
  audioCodec: string;
  hdr: string;
  bitrate?: number;
  fileSize?: string;
  source?: string;
}

// ============ 聚合源 ============
export interface AggregatedSource {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  quality: VideoQualityInfo;
  playUrl: string;
  updateTime?: string;
  reliability: number;
}

// ============ 聚合剧集 ============
export interface AggregatedEpisode {
  episodeNumber: number;
  title?: string;
  sources: AggregatedSource[];
  bestQuality: VideoQualityInfo;
}

// ============ 聚合搜索结果 ============
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

// ============ 联想搜索建议项 ============
export interface SuggestItem {
  text: string;
  type?: string;
  posterUrl?: string;
  id?: string;
}

// ============ 搜索统计 ============
export interface SearchStats {
  totalTime: number;
  totalSources: number;
  successSources: number;
}

// ============ 源搜索 API 响应 ============
export interface SourceSearchResponse {
  results: AggregatedResult[];
  stats: SearchStats;
  query: string;
}

// ============ 联想搜索 API 响应 ============
export interface SuggestResponse {
  suggestions: SuggestItem[];
  took?: number;
}

// ============ 画质优先级映射 ============
export const QUALITY_PRIORITY: Record<string, number> = {
  '4K': 4,
  '2K': 3,
  '1080P': 2,
  '720P': 1,
  '480P': 0,
  unknown: -1,
};

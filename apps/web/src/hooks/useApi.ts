'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { apiClient } from '@/lib/api/client';

// 通用 fetcher（apiClient 拦截器已解包 data）
const fetcher = async <T>(url: string): Promise<T> => {
  const response = await apiClient.get(url);
  return response as unknown as T;
};

// 通用 GET hook
export function useApi<T>(url: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    url,
    fetcher as (url: string) => Promise<T>,
    {
      revalidateOnFocus: false,
      ...options,
    },
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// 媒体列表 hook
export function useMediaList(endpoint: string, page: number = 1, pageSize: number = 20) {
  return useApi<{
    items: Array<{
      id: string;
      title: string;
      posterUrl?: string;
      rating?: number;
      year?: number;
      type?: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>(`${endpoint}?page=${page}&pageSize=${pageSize}`);
}

// 媒体详情 hook
export function useMediaDetail(id: string | null) {
  return useApi<{
    id: string;
    title: string;
    originalTitle?: string;
    type: string;
    overview?: string;
    posterUrl?: string;
    backdropUrl?: string;
    rating?: number;
    releaseDate?: string;
    duration?: number;
    genres?: Array<{ id: string; name: string; slug: string }>;
    seasons?: Array<{
      id: string;
      number: number;
      name?: string;
      episodes?: Array<{
        id: string;
        number: number;
        title?: string;
        duration?: number;
        thumbnailUrl?: string;
        hlsPath?: string;
      }>;
    }>;
  }>(id ? `/media/${id}` : null);
}

// 搜索 hook
export function useSearch(query: string | null) {
  return useApi<{
    items: Array<{
      id: string;
      title: string;
      posterUrl?: string;
      rating?: number;
      year?: number;
      type?: string;
    }>;
    total: number;
  }>(query ? `/search?q=${encodeURIComponent(query)}` : null);
}

// 收藏列表 hook
export function useFavorites() {
  return useApi<
    Array<{
      id: string;
      mediaId: string;
      media?: {
        id: string;
        title: string;
        posterUrl?: string;
        rating?: number;
      };
    }>
  >('/favorites');
}

// 观看历史 hook
export function useHistory() {
  return useApi<
    Array<{
      id: string;
      mediaId: string;
      progress: number;
      duration: number;
      lastWatch: string;
      completed?: boolean;
      media?: {
        id: string;
        title: string;
        posterUrl?: string;
      };
    }>
  >('/progress');
}

// 联想搜索 hook
export function useSearchSuggest(query: string | null, limit: number = 8) {
  return useApi<{
    suggestions: Array<{
      text: string;
      type?: string;
      posterUrl?: string;
      id?: string;
    }>;
  }>(
    query && query.length >= 1
      ? `/search/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
      : null,
    { dedupingInterval: 300 },
  );
}

// 聚合源搜索 hook（用于搜索结果页和详情页）
export function useSourceSearch(query: string | null) {
  return useApi<{
    results: Array<{
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
      sources: Array<{
        sourceId: string;
        sourceName: string;
        sourceType: string;
        quality: {
          resolution: string;
          codec: string;
          audioCodec: string;
          hdr: string;
          bitrate?: number;
          fileSize?: string;
          source?: string;
        };
        playUrl: string;
        updateTime?: string;
        reliability: number;
      }>;
      bestQuality: {
        resolution: string;
        codec: string;
        audioCodec: string;
        hdr: string;
        bitrate?: number;
        fileSize?: string;
        source?: string;
      };
      totalSources: number;
      episodes?: Array<{
        episodeNumber: number;
        title?: string;
        sources: Array<{
          sourceId: string;
          sourceName: string;
          sourceType: string;
          quality: {
            resolution: string;
            codec: string;
            audioCodec: string;
            hdr: string;
          };
          playUrl: string;
          reliability: number;
        }>;
        bestQuality: {
          resolution: string;
          codec: string;
          audioCodec: string;
          hdr: string;
        };
      }>;
      score: number;
    }>;
    stats: {
      totalTime: number;
      totalSources: number;
      successSources: number;
    };
    query: string;
  }>(
    query ? `/source/search?q=${encodeURIComponent(query)}` : null,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );
}

// 热门媒体 hook
export function useTrending() {
  return useApi<
    Array<{
      id: string;
      title: string;
      posterUrl?: string;
      backdropUrl?: string;
      rating?: number;
      year?: number;
      type?: string;
      overview?: string;
    }>
  >('/media/trending', { revalidateOnFocus: false, dedupingInterval: 60000 });
}

// 最新媒体 hook
export function useLatest() {
  return useApi<
    Array<{
      id: string;
      title: string;
      posterUrl?: string;
      rating?: number;
      year?: number;
      type?: string;
    }>
  >('/media/latest', { revalidateOnFocus: false, dedupingInterval: 60000 });
}

// 相似媒体 hook
export function useSimilarMedia(id: string | null) {
  return useApi<
    Array<{
      id: string;
      title: string;
      posterUrl?: string;
      rating?: number;
      year?: number;
      type?: string;
    }>
  >(id ? `/search/similar/${id}?limit=10` : null);
}

// 检查是否已收藏
export function useIsFavorite(mediaId: string | null) {
  return useApi<{ isFavorite: boolean }>(
    mediaId ? `/favorites/check/${mediaId}` : null,
  );
}

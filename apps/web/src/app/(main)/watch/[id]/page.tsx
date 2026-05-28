'use client';

import { Suspense, use, useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Star, Calendar, Monitor, Wifi, Shuffle, Heart } from 'lucide-react';

import { VideoPlayer } from '@/components/player';
import { useMediaDetail, useSourceSearch, useIsFavorite } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils/cn';
import type { PlayerConfig, QualityLevel, SubtitleTrack, EpisodeInfo, SeasonInfo } from '@/types/player';
import type { AggregatedResult, AggregatedSource, AggregatedEpisode } from '@/types/source';
import { QUALITY_PRIORITY } from '@/types/source';

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

function resolutionToSize(resolution: string): { width: number; height: number; bitrate: number } {
  switch (resolution) {
    case '4K': return { width: 3840, height: 2160, bitrate: 20_000_000 };
    case '2K': return { width: 2560, height: 1440, bitrate: 12_000_000 };
    case '1080P': return { width: 1920, height: 1080, bitrate: 8_000_000 };
    case '720P': return { width: 1280, height: 720, bitrate: 4_000_000 };
    case '480P': return { width: 854, height: 480, bitrate: 2_000_000 };
    default: return { width: 1920, height: 1080, bitrate: 8_000_000 };
  }
}

function sortByQuality<T extends { quality: { resolution: string } }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (QUALITY_PRIORITY[b.quality.resolution] ?? -1) - (QUALITY_PRIORITY[a.quality.resolution] ?? -1),
  );
}

function WatchPageInner({ params }: WatchPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { data: media, isLoading } = useMediaDetail(id);
  const { data: sourceData } = useSourceSearch(media?.title ?? null);
  const { data: favData, mutate: mutateFav } = useIsFavorite(isAuthenticated ? id : null);
  const [favLoading, setFavLoading] = useState(false);
  const isFavorited = favData?.isFavorite ?? false;
  const store = usePlayerStore();

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setFavLoading(true);
    try {
      if (isFavorited) {
        await apiClient.delete(`/favorites/${id}`);
      } else {
        await apiClient.post(`/favorites/${id}`);
      }
      mutateFav({ isFavorite: !isFavorited }, { revalidate: false });
    } catch {
      // ignore
    } finally {
      setFavLoading(false);
    }
  }, [isAuthenticated, isFavorited, id, router, mutateFav]);

  // 从 sessionStorage 读取缓存的源数据（从详情页跳转时存储）
  const cachedSourceData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(`source-${id}`);
      return cached ? (JSON.parse(cached) as AggregatedResult) : null;
    } catch { return null; }
  }, [id]);

  const aggregatedResult = sourceData?.results?.[0] ?? cachedSourceData;

  // URL 参数
  const initialSourceIdx = Number(searchParams.get('source') ?? '0');
  const initialEpisodeNum = searchParams.get('episode') ? Number(searchParams.get('episode')) : undefined;

  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | undefined>();
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number | undefined>(initialEpisodeNum);
  const [currentSeasonIdx, setCurrentSeasonIdx] = useState(0);
  const [currentSourceIdx, setCurrentSourceIdx] = useState(initialSourceIdx);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showSourceList, setShowSourceList] = useState(false);

  // 数据源：优先用聚合源，回退到本地 DB
  const useSourceMode = aggregatedResult && aggregatedResult.sources.length > 0;

  const seasons = media?.seasons ?? [];
  const currentSeason = seasons[currentSeasonIdx];
  const dbEpisodes: EpisodeInfo[] = useMemo(
    () =>
      (currentSeason?.episodes ?? []).map((ep) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        duration: ep.duration,
        thumbnailUrl: ep.thumbnailUrl,
        hlsPath: ep.hlsPath,
        seasonNumber: currentSeason?.number,
      })),
    [currentSeason],
  );

  // 聚合源的剧集
  const sourceEpisodes: AggregatedEpisode[] = useMemo(
    () => (aggregatedResult?.episodes ?? []).sort((a, b) => a.episodeNumber - b.episodeNumber),
    [aggregatedResult],
  );

  const isSourceSeries = useSourceMode && (aggregatedResult?.isSeries ?? false) && sourceEpisodes.length > 0;

  // 当前剧集（聚合源模式）
  const currentSourceEpisode = sourceEpisodes.find((ep) => ep.episodeNumber === currentEpisodeNum);
  const currentSourceEpisodeIdx = sourceEpisodes.findIndex((ep) => ep.episodeNumber === currentEpisodeNum);

  // 当前剧集（DB 模式）
  const currentDbEpisode = dbEpisodes.find((ep) => ep.id === currentEpisodeId);
  const currentDbEpisodeIdx = dbEpisodes.findIndex((ep) => ep.id === currentEpisodeId);

  // 排序后的源
  const sortedSources = useSourceMode ? sortByQuality(aggregatedResult!.sources) : [];
  const currentSource = sortedSources[currentSourceIdx] ?? sortedSources[0];

  // 当前剧集的源（电视剧模式）
  const currentEpisodeSources = currentSourceEpisode
    ? sortByQuality(currentSourceEpisode.sources)
    : sortedSources;
  const currentEpisodeSource = currentEpisodeSources[currentSourceIdx] ?? currentEpisodeSources[0];

  const handleNextEpisode = useCallback(() => {
    if (isSourceSeries) {
      if (currentSourceEpisodeIdx < sourceEpisodes.length - 1) {
        const next = sourceEpisodes[currentSourceEpisodeIdx + 1];
        if (next) setCurrentEpisodeNum(next.episodeNumber);
      }
    } else {
      if (currentDbEpisodeIdx < dbEpisodes.length - 1) {
        const next = dbEpisodes[currentDbEpisodeIdx + 1];
        if (next) setCurrentEpisodeId(next.id);
      }
    }
  }, [isSourceSeries, currentSourceEpisodeIdx, sourceEpisodes, currentDbEpisodeIdx, dbEpisodes]);

  const handlePrevEpisode = useCallback(() => {
    if (isSourceSeries) {
      if (currentSourceEpisodeIdx > 0) {
        const prev = sourceEpisodes[currentSourceEpisodeIdx - 1];
        if (prev) setCurrentEpisodeNum(prev.episodeNumber);
      }
    } else {
      if (currentDbEpisodeIdx > 0) {
        const prev = dbEpisodes[currentDbEpisodeIdx - 1];
        if (prev) setCurrentEpisodeId(prev.id);
      }
    }
  }, [isSourceSeries, currentSourceEpisodeIdx, sourceEpisodes, currentDbEpisodeIdx, dbEpisodes]);

  // 构建播放器配置
  const playerConfig = useMemo<PlayerConfig | null>(() => {
    if (!media) return null;

    const hlsBase = process.env.NEXT_PUBLIC_STREAM_URL ?? '/api/v1/stream';

    let sources: QualityLevel[];
    let title: string;

    if (useSourceMode) {
      // 聚合源模式：每个源 = 一个画质选项
      const activeSources = isSourceSeries ? currentEpisodeSources : sortedSources;
      sources = activeSources.map((s, idx) => {
        const size = resolutionToSize(s.quality.resolution);
        return {
          label: `${s.quality.resolution} - ${s.sourceName}`,
          value: `${s.quality.resolution.toLowerCase()}-${s.sourceId}`,
          width: size.width,
          height: size.height,
          bitrate: s.quality.bitrate ?? size.bitrate,
          url: s.playUrl,
          default: idx === 0,
        };
      });

      if (isSourceSeries && currentSourceEpisode) {
        title = `${media.title} - 第${currentSourceEpisode.episodeNumber}集${currentSourceEpisode.title ? ` ${currentSourceEpisode.title}` : ''}`;
      } else {
        title = media.title;
      }
    } else {
      // DB 模式：回退到本地 HLS
      const episodeHlsPath = currentDbEpisode?.hlsPath;
      const sourceUrl = episodeHlsPath
        ? `${hlsBase}/${episodeHlsPath}`
        : `${hlsBase}/${id}/master.m3u8`;

      sources = [
        { label: '1080P', value: '1080p', width: 1920, height: 1080, bitrate: 8_000_000, url: sourceUrl, default: true },
        { label: '720P', value: '720p', width: 1280, height: 720, bitrate: 4_000_000, url: sourceUrl },
        { label: '480P', value: '480p', width: 854, height: 480, bitrate: 2_000_000, url: sourceUrl },
      ];

      title = currentDbEpisode
        ? `${media.title} - 第${currentDbEpisode.number}集${currentDbEpisode.title ? ` ${currentDbEpisode.title}` : ''}`
        : media.title;
    }

    const subtitles: SubtitleTrack[] = [
      { id: 'zh', label: '中文', language: 'zh', url: `${hlsBase}/${id}/subtitle/zh.vtt`, type: 'vtt', default: true },
      { id: 'en', label: 'English', language: 'en', url: `${hlsBase}/${id}/subtitle/en.vtt`, type: 'vtt' },
    ];

    const totalEpisodes = isSourceSeries ? sourceEpisodes.length : dbEpisodes.length;
    const currentIdx = isSourceSeries ? currentSourceEpisodeIdx : currentDbEpisodeIdx;

    return {
      mediaId: id,
      episodeId: currentEpisodeId ?? String(currentEpisodeNum),
      title,
      sources,
      subtitles,
      poster: media.backdropUrl ?? media.posterUrl,
      autoplay: true,
      hasNextEpisode: currentIdx < totalEpisodes - 1,
      hasPrevEpisode: currentIdx > 0,
      onNextEpisode: handleNextEpisode,
      onPrevEpisode: handlePrevEpisode,
    };
  }, [media, id, useSourceMode, isSourceSeries, currentEpisodeSources, sortedSources, currentSourceEpisode, currentSourceEpisodeIdx, currentDbEpisode, currentDbEpisodeIdx, currentEpisodeId, currentEpisodeNum, dbEpisodes, sourceEpisodes.length, handleNextEpisode, handlePrevEpisode]);

  // 默认选中第一集
  useEffect(() => {
    if (isSourceSeries && !currentEpisodeNum && sourceEpisodes.length > 0) {
      setCurrentEpisodeNum(sourceEpisodes[0].episodeNumber);
    } else if (!isSourceSeries && dbEpisodes.length > 0 && !currentEpisodeId) {
      setCurrentEpisodeId(dbEpisodes[0].id);
    }
  }, [isSourceSeries, sourceEpisodes, currentEpisodeNum, dbEpisodes, currentEpisodeId]);

  // 预加载下一集的 m3u8 链接
  useEffect(() => {
    if (!playerConfig?.hasNextEpisode) return;

    let nextUrl: string | undefined;
    if (isSourceSeries && currentSourceEpisodeIdx >= 0 && currentSourceEpisodeIdx < sourceEpisodes.length - 1) {
      const nextEp = sourceEpisodes[currentSourceEpisodeIdx + 1];
      const nextSources = sortByQuality(nextEp.sources);
      nextUrl = nextSources[0]?.playUrl;
    } else if (!isSourceSeries && currentDbEpisodeIdx >= 0 && currentDbEpisodeIdx < dbEpisodes.length - 1) {
      const nextEp = dbEpisodes[currentDbEpisodeIdx + 1];
      const hlsBase = process.env.NEXT_PUBLIC_STREAM_URL ?? '/api/v1/stream';
      nextUrl = nextEp.hlsPath ? `${hlsBase}/${nextEp.hlsPath}` : `${hlsBase}/${id}/master.m3u8`;
    }

    if (nextUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = nextUrl;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      return () => { document.head.removeChild(link); };
    }
  }, [playerConfig?.hasNextEpisode, isSourceSeries, currentSourceEpisodeIdx, sourceEpisodes, currentDbEpisodeIdx, dbEpisodes, id]);

  // 全屏时隐藏影院模式
  useEffect(() => {
    if (store.isFullscreen && store.isCinemaMode) {
      store.toggleCinemaMode();
    }
  }, [store.isFullscreen]);

  // 切换源
  const handleSwitchSource = useCallback((idx: number) => {
    setCurrentSourceIdx(idx);
    setShowSourceList(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">加载中...</p>
        </motion.div>
      </div>
    );
  }

  if (!media || !playerConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 text-lg mb-4">未找到该媒体</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary hover:text-primary-400 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-black transition-all duration-500',
        store.isCinemaMode && 'cinema-mode',
      )}
    >
      {/* 影院模式背景 */}
      <AnimatePresence>
        {store.isCinemaMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0"
            style={{
              background: `radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.95) 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* 顶部导航 */}
      <AnimatePresence>
        {store.controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 py-3"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium hidden md:inline">返回</span>
            </button>

            <div className="flex items-center gap-3">
              <h1 className="text-white/90 text-sm md:text-base font-medium line-clamp-1 max-w-[300px]">
                {playerConfig.title}
              </h1>
            </div>

            <div className="w-16" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 播放器 */}
      <div className="relative w-full max-w-screen-2xl mx-auto">
        <VideoPlayer config={playerConfig} className={cn(store.isCinemaMode && 'shadow-2xl shadow-black/80')} />
      </div>

      {/* 底部信息区 */}
      <AnimatePresence>
        {store.controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative z-10 max-w-screen-2xl mx-auto px-4 md:px-6 py-6"
          >
            {/* 媒体信息 */}
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 mb-6">
              {media.posterUrl && (
                <div className="w-20 h-28 md:w-24 md:h-36 rounded-xl overflow-hidden flex-shrink-0 shadow-xl shadow-black/50">
                  <img
                    src={media.posterUrl}
                    alt={media.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-xl md:text-2xl font-bold mb-2">
                  {media.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-white/50 text-sm mb-3">
                  {media.rating && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      {media.rating.toFixed(1)}
                    </span>
                  )}
                  {media.releaseDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(media.releaseDate).getFullYear()}
                    </span>
                  )}
                  {currentDbEpisode?.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(currentDbEpisode.duration / 60)}分钟
                    </span>
                  )}
                  {useSourceMode && currentSource && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Monitor className="w-3.5 h-3.5" />
                      {currentSource.sourceName}
                    </span>
                  )}
                </div>
                {media.overview && (
                  <p className="text-white/60 text-sm leading-relaxed line-clamp-3">
                    {media.overview}
                  </p>
                )}
                <button
                  onClick={handleToggleFavorite}
                  disabled={favLoading}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white disabled:opacity-50"
                >
                  <Heart size={16} className={isFavorited ? 'fill-primary text-primary' : ''} />
                  {isFavorited ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>

            {/* 剧集列表 */}
            {(seasons.length > 0 || isSourceSeries) && (
              <div>
                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
                >
                  <span className="text-base font-semibold">选集</span>
                  {showEpisodeList ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                <AnimatePresence>
                  {showEpisodeList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* DB 季选择 */}
                      {!isSourceSeries && seasons.length > 1 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                          {seasons.map((season, idx) => (
                            <button
                              key={season.id}
                              onClick={() => {
                                setCurrentSeasonIdx(idx);
                                setCurrentEpisodeId(undefined);
                              }}
                              className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                                idx === currentSeasonIdx
                                  ? 'bg-primary text-white'
                                  : 'bg-background-elevated text-text-secondary hover:text-white',
                              )}
                            >
                              {season.name ?? `第${season.number}季`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* DB 集列表 */}
                      {!isSourceSeries && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {dbEpisodes.map((ep) => (
                            <button
                              key={ep.id}
                              onClick={() => setCurrentEpisodeId(ep.id)}
                              className={cn(
                                'relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95',
                                ep.id === currentEpisodeId
                                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
                                  : 'hover:ring-1 hover:ring-white/20',
                              )}
                            >
                              {ep.thumbnailUrl ? (
                                <div className="aspect-video">
                                  <img src={ep.thumbnailUrl} alt={ep.title ?? `第${ep.number}集`} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                </div>
                              ) : (
                                <div className={cn('aspect-video flex items-center justify-center', ep.id === currentEpisodeId ? 'bg-primary/20' : 'bg-background-elevated')}>
                                  <span className={cn('text-lg font-bold', ep.id === currentEpisodeId ? 'text-primary' : 'text-white/30')}>{ep.number}</span>
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 p-1.5">
                                <p className="text-white text-xs font-medium truncate">{ep.title ?? `第${ep.number}集`}</p>
                              </div>
                              {ep.id === currentEpisodeId && (
                                <div className="absolute top-1.5 right-1.5">
                                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 聚合源集列表 */}
                      {isSourceSeries && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {sourceEpisodes.map((ep) => {
                            const epSources = sortByQuality(ep.sources);
                            const isSelected = ep.episodeNumber === currentEpisodeNum;
                            return (
                              <button
                                key={ep.episodeNumber}
                                onClick={() => setCurrentEpisodeNum(ep.episodeNumber)}
                                className={cn(
                                  'relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95',
                                  isSelected
                                    ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
                                    : 'hover:ring-1 hover:ring-white/20',
                                )}
                              >
                                <div className={cn('aspect-video flex items-center justify-center', isSelected ? 'bg-primary/20' : 'bg-background-elevated')}>
                                  <span className={cn('text-lg font-bold', isSelected ? 'text-primary' : 'text-white/30')}>{ep.episodeNumber}</span>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-1.5">
                                  <p className="text-white text-xs font-medium truncate">{ep.title ?? `第${ep.episodeNumber}集`}</p>
                                </div>
                                <div className="absolute top-1 right-1">
                                  <span className="text-[8px] text-white/40 bg-black/40 rounded px-0.5">{epSources.length}源</span>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1.5 left-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* 切换源 */}
            {useSourceMode && sortedSources.length > 1 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSourceList(!showSourceList)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-3"
                >
                  <Shuffle className="w-4 h-4" />
                  <span className="text-base font-semibold">切换源</span>
                  <span className="text-xs text-white/40">
                    当前：{currentSource?.sourceName ?? '-'}
                  </span>
                  {showSourceList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                <AnimatePresence>
                  {showSourceList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(isSourceSeries ? currentEpisodeSources : sortedSources).map((source, idx) => {
                          const isActive = idx === currentSourceIdx;
                          return (
                            <button
                              key={source.sourceId}
                              onClick={() => handleSwitchSource(idx)}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                                isActive
                                  ? 'bg-primary/15 ring-1 ring-primary/30'
                                  : 'bg-white/[0.03] hover:bg-white/[0.06]',
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm text-white/90 font-medium truncate">{source.sourceName}</span>
                                  <span className="text-xs text-emerald-400 font-bold">{source.quality.resolution}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/40">
                                  {source.quality.codec !== 'unknown' && <span>{source.quality.codec}</span>}
                                  <span className="flex items-center gap-0.5"><Wifi size={10} />{Math.round(source.reliability * 100)}%</span>
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WatchPage({ params }: WatchPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WatchPageInner params={params} />
    </Suspense>
  );
}

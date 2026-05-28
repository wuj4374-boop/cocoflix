'use client';

import { use, useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Monitor, Wifi, Shuffle } from 'lucide-react';

import { VideoPlayer } from '@/components/player';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils/cn';
import type { PlayerConfig, QualityLevel } from '@/types/player';
import type { AggregatedResult, AggregatedSource, AggregatedEpisode } from '@/types/source';
import { QUALITY_PRIORITY } from '@/types/source';

interface SourceWatchPageProps {
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

export default function SourceWatchPage({ params }: SourceWatchPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const store = usePlayerStore();

  // 从 sessionStorage 读取聚合结果
  const aggregatedResult = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(`source-${id}`);
      return cached ? (JSON.parse(cached) as AggregatedResult) : null;
    } catch { return null; }
  }, [id]);

  const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number | undefined>();
  const [currentSourceIdx, setCurrentSourceIdx] = useState(0);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showSourceList, setShowSourceList] = useState(false);

  const sortedSources = aggregatedResult ? sortByQuality(aggregatedResult.sources) : [];
  const isSeries = aggregatedResult?.isSeries ?? false;
  const sourceEpisodes: AggregatedEpisode[] = useMemo(
    () => (aggregatedResult?.episodes ?? []).sort((a, b) => a.episodeNumber - b.episodeNumber),
    [aggregatedResult],
  );

  const currentSourceEpisode = sourceEpisodes.find((ep) => ep.episodeNumber === currentEpisodeNum);
  const currentSourceEpisodeIdx = sourceEpisodes.findIndex((ep) => ep.episodeNumber === currentEpisodeNum);

  const currentEpisodeSources = currentSourceEpisode
    ? sortByQuality(currentSourceEpisode.sources)
    : sortedSources;
  const currentSource = currentEpisodeSources[currentSourceIdx] ?? currentEpisodeSources[0];

  const handleNextEpisode = useCallback(() => {
    if (currentSourceEpisodeIdx < sourceEpisodes.length - 1) {
      const next = sourceEpisodes[currentSourceEpisodeIdx + 1];
      if (next) setCurrentEpisodeNum(next.episodeNumber);
    }
  }, [currentSourceEpisodeIdx, sourceEpisodes]);

  const handlePrevEpisode = useCallback(() => {
    if (currentSourceEpisodeIdx > 0) {
      const prev = sourceEpisodes[currentSourceEpisodeIdx - 1];
      if (prev) setCurrentEpisodeNum(prev.episodeNumber);
    }
  }, [currentSourceEpisodeIdx, sourceEpisodes]);

  // 构建播放器配置
  const playerConfig = useMemo<PlayerConfig | null>(() => {
    if (!aggregatedResult || !currentSource) return null;

    const activeSources = isSeries && currentSourceEpisode ? currentEpisodeSources : sortedSources;

    const sources: QualityLevel[] = activeSources.map((s, idx) => {
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

    let title = aggregatedResult.title;
    if (isSeries && currentSourceEpisode) {
      title = `${aggregatedResult.title} - 第${currentSourceEpisode.episodeNumber}集${currentSourceEpisode.title ? ` ${currentSourceEpisode.title}` : ''}`;
    }

    return {
      mediaId: id,
      episodeId: String(currentEpisodeNum ?? ''),
      title,
      sources,
      poster: aggregatedResult.poster,
      autoplay: true,
      hasNextEpisode: isSeries ? currentSourceEpisodeIdx < sourceEpisodes.length - 1 : false,
      hasPrevEpisode: isSeries ? currentSourceEpisodeIdx > 0 : false,
      onNextEpisode: handleNextEpisode,
      onPrevEpisode: handlePrevEpisode,
    };
  }, [aggregatedResult, id, isSeries, currentSourceEpisode, currentSourceEpisodeIdx, currentEpisodeSources, sortedSources, currentSource, currentEpisodeNum, sourceEpisodes.length, handleNextEpisode, handlePrevEpisode]);

  const handleSwitchSource = useCallback((idx: number) => {
    setCurrentSourceIdx(idx);
    setShowSourceList(false);
  }, []);

  // 默认选中第一集
  useEffect(() => {
    if (isSeries && !currentEpisodeNum && sourceEpisodes.length > 0) {
      setCurrentEpisodeNum(sourceEpisodes[0].episodeNumber);
    }
  }, [isSeries, sourceEpisodes, currentEpisodeNum]);

  // 全屏时隐藏影院模式
  useEffect(() => {
    if (store.isFullscreen && store.isCinemaMode) {
      store.toggleCinemaMode();
    }
  }, [store.isFullscreen]);

  if (!aggregatedResult) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 text-lg mb-4">未找到播放源信息</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:text-primary-400 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!playerConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-black transition-all duration-500', store.isCinemaMode && 'cinema-mode')}>
      {/* 影院模式背景 */}
      <AnimatePresence>
        {store.isCinemaMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0"
            style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.95) 70%)` }}
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
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium hidden md:inline">返回</span>
            </button>
            <h1 className="text-white/90 text-sm md:text-base font-medium line-clamp-1 max-w-[300px]">{playerConfig.title}</h1>
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
            {/* 信息 */}
            <div className="mb-6">
              <h2 className="text-white text-xl md:text-2xl font-bold mb-2">{aggregatedResult.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-white/50 text-sm">
                {aggregatedResult.year && <span>{aggregatedResult.year}</span>}
                {currentSource && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Monitor className="w-3.5 h-3.5" />
                    {currentSource.sourceName} · {currentSource.quality.resolution}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
                  {sortedSources.length} 个源
                </span>
              </div>
              {aggregatedResult.description && (
                <p className="text-white/60 text-sm leading-relaxed line-clamp-3 mt-3">{aggregatedResult.description}</p>
              )}
            </div>

            {/* 选集 */}
            {isSeries && sourceEpisodes.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-3"
                >
                  <span className="text-base font-semibold">选集</span>
                  <span className="text-xs text-white/40">{sourceEpisodes.length} 集</span>
                  {showEpisodeList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <AnimatePresence>
                  {showEpisodeList && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {sourceEpisodes.map((ep) => {
                          const isSelected = ep.episodeNumber === currentEpisodeNum;
                          return (
                            <button
                              key={ep.episodeNumber}
                              onClick={() => setCurrentEpisodeNum(ep.episodeNumber)}
                              className={cn(
                                'relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95',
                                isSelected ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : 'hover:ring-1 hover:ring-white/20',
                              )}
                            >
                              <div className={cn('aspect-video flex items-center justify-center', isSelected ? 'bg-primary/20' : 'bg-background-elevated')}>
                                <span className={cn('text-lg font-bold', isSelected ? 'text-primary' : 'text-white/30')}>{ep.episodeNumber}</span>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 p-1.5">
                                <p className="text-white text-xs font-medium truncate">{ep.title ?? `第${ep.episodeNumber}集`}</p>
                              </div>
                              <div className="absolute top-1 right-1">
                                <span className="text-[8px] text-white/40 bg-black/40 rounded px-0.5">{ep.sources.length}源</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* 切换源 */}
            {sortedSources.length > 1 && (
              <div>
                <button
                  onClick={() => setShowSourceList(!showSourceList)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-3"
                >
                  <Shuffle className="w-4 h-4" />
                  <span className="text-base font-semibold">切换源</span>
                  <span className="text-xs text-white/40">当前：{currentSource?.sourceName ?? '-'}</span>
                  {showSourceList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <AnimatePresence>
                  {showSourceList && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentEpisodeSources.map((source, idx) => {
                          const isActive = idx === currentSourceIdx;
                          return (
                            <button
                              key={source.sourceId}
                              onClick={() => handleSwitchSource(idx)}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                                isActive ? 'bg-primary/15 ring-1 ring-primary/30' : 'bg-white/[0.03] hover:bg-white/[0.06]',
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
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
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

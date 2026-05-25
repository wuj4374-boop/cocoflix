'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronDown, ChevronUp, Monitor, Wifi } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { GlassCard, Badge } from '@/components/ui';
import type { AggregatedSource, AggregatedEpisode } from '@/types/source';
import { QUALITY_PRIORITY } from '@/types/source';

interface SourceListProps {
  sources: AggregatedSource[];
  episodes?: AggregatedEpisode[];
  isSeries: boolean;
  onPlaySource: (source: AggregatedSource, episode?: AggregatedEpisode) => void;
}

const qualityColorMap: Record<string, string> = {
  '4K': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  '2K': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '1080P': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  '720P': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '480P': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  unknown: 'bg-gray-600/20 text-gray-500 border-gray-600/30',
};

function sortByQuality<T extends { quality: { resolution: string } }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (QUALITY_PRIORITY[b.quality.resolution] ?? -1) - (QUALITY_PRIORITY[a.quality.resolution] ?? -1),
  );
}

function SourceRow({
  source,
  onPlay,
}: {
  source: AggregatedSource;
  onPlay: () => void;
}) {
  const quality = source.quality?.resolution ?? 'unknown';
  const reliabilityPercent = Math.round((source.reliability ?? 0) * 100);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
      {/* 源信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-white/90 font-medium truncate">
            {source.sourceName}
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold border',
              qualityColorMap[quality] ?? qualityColorMap.unknown,
            )}
          >
            {quality}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          {source.quality?.codec && source.quality.codec !== 'unknown' && (
            <span>{source.quality.codec}</span>
          )}
          {source.quality?.audioCodec && source.quality.audioCodec !== 'unknown' && (
            <span>{source.quality.audioCodec}</span>
          )}
          <span className="flex items-center gap-1">
            <Wifi size={10} />
            {reliabilityPercent}%
          </span>
        </div>
      </div>

      {/* 播放按钮 */}
      <button
        onClick={onPlay}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium opacity-0 group-hover:opacity-100"
      >
        <Play size={14} fill="currentColor" />
        播放
      </button>
    </div>
  );
}

export function SourceList({ sources, episodes, isSeries, onPlaySource }: SourceListProps) {
  const [showEpisodes, setShowEpisodes] = useState(true);
  const sortedSources = sortByQuality(sources);

  // 电影模式：直接显示源列表
  if (!isSeries) {
    return (
      <GlassCard variant="default" padding="md">
        <div className="space-y-2">
          {sortedSources.map((source) => (
            <SourceRow
              key={source.sourceId}
              source={source}
              onPlay={() => onPlaySource(source)}
            />
          ))}
        </div>
      </GlassCard>
    );
  }

  // 电视剧/动漫模式：显示剧集列表
  const sortedEpisodes = episodes
    ? [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)
    : [];

  return (
    <div className="space-y-4">
      {/* 总源信息 */}
      {sortedSources.length > 0 && (
        <GlassCard variant="default" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white/70">聚合源</h4>
            <Badge variant="glass" size="sm">
              {sortedSources.length} 个源
            </Badge>
          </div>
          <div className="space-y-2">
            {sortedSources.slice(0, 3).map((source) => (
              <SourceRow
                key={source.sourceId}
                source={source}
                onPlay={() => onPlaySource(source)}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* 剧集列表 */}
      {sortedEpisodes.length > 0 && (
        <div>
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
          >
            <span className="text-base font-semibold">剧集列表</span>
            <Badge variant="glass" size="sm">
              {sortedEpisodes.length} 集
            </Badge>
            {showEpisodes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {showEpisodes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedEpisodes.map((ep) => {
                    const epSources = sortByQuality(ep.sources ?? []);
                    const bestQuality = ep.bestQuality?.resolution ?? 'unknown';

                    return (
                      <div
                        key={ep.episodeNumber}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
                        onClick={() => epSources[0] && onPlaySource(epSources[0], ep)}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium group-hover:bg-primary/20 transition-colors flex-shrink-0">
                          {ep.episodeNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white line-clamp-1">
                            {ep.title ?? `第 ${ep.episodeNumber} 集`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                'px-1 py-0.5 rounded text-[10px] font-bold border',
                                qualityColorMap[bestQuality] ?? qualityColorMap.unknown,
                              )}
                            >
                              {bestQuality}
                            </span>
                            <span className="text-xs text-white/40">
                              {epSources.length} 个源
                            </span>
                          </div>
                        </div>
                        <Play
                          size={16}
                          className="text-white/20 group-hover:text-primary transition-colors flex-shrink-0"
                          fill="currentColor"
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

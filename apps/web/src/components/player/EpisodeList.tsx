'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, ChevronLeft } from 'lucide-react';
import type { EpisodeInfo, SeasonInfo } from '@/types/player';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';

interface EpisodeListProps {
  seasons: SeasonInfo[];
  currentEpisodeId?: string;
  onSelectEpisode: (episodeId: string) => void;
  onSelectSeason?: (seasonIndex: number) => void;
  visible: boolean;
  onClose: () => void;
}

export function EpisodeList({
  seasons,
  currentEpisodeId,
  onSelectEpisode,
  onSelectSeason,
  visible,
  onClose,
}: EpisodeListProps) {
  const [activeSeason, setActiveSeason] = useState(0);
  const currentSeason = seasons[activeSeason];
  const episodes = currentSeason?.episodes ?? [];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 bottom-0 z-50 w-[360px] bg-black/95 backdrop-blur-xl border-l border-white/10 overflow-hidden flex flex-col"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </button>
            <h3 className="text-white font-semibold text-base">选集</h3>
            <div className="w-16" />
          </div>

          {/* 季选择 */}
          {seasons.length > 1 && (
            <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
              {seasons.map((season, idx) => (
                <button
                  key={season.id}
                  onClick={() => {
                    setActiveSeason(idx);
                    onSelectSeason?.(idx);
                  }}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                    idx === activeSeason
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10',
                  )}
                >
                  {season.name ?? `第${season.number}季`}
                </button>
              ))}
            </div>
          )}

          {/* 集列表 */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {episodes.map((ep) => {
              const isCurrent = ep.id === currentEpisodeId;
              return (
                <motion.button
                  key={ep.id}
                  onClick={() => {
                    onSelectEpisode(ep.id);
                    onClose();
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                    isCurrent
                      ? 'bg-primary/15 border border-primary/30'
                      : 'hover:bg-white/5 border border-transparent',
                  )}
                >
                  {/* 集缩略图或编号 */}
                  <div
                    className={cn(
                      'relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0',
                      !ep.thumbnailUrl && 'flex items-center justify-center',
                    )}
                  >
                    {ep.thumbnailUrl ? (
                      <>
                        <img
                          src={ep.thumbnailUrl}
                          alt={ep.title ?? `第${ep.number}集`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        {isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-5 h-5 text-primary fill-primary" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        className={cn(
                          'w-full h-full rounded-lg flex items-center justify-center text-lg font-bold',
                          isCurrent
                            ? 'bg-primary/20 text-primary'
                            : 'bg-white/5 text-white/20',
                        )}
                      >
                        {ep.number}
                      </div>
                    )}
                  </div>

                  {/* 集信息 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isCurrent ? 'text-primary' : 'text-white/80',
                      )}
                    >
                      {ep.title ?? `第${ep.number}集`}
                    </p>
                    {ep.duration && (
                      <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {Math.floor(ep.duration / 60)}分钟
                      </p>
                    )}
                  </div>

                  {/* 播放中指示 */}
                  {isCurrent && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                      <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1 h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

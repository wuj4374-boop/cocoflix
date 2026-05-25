'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Trash2, AlertCircle } from 'lucide-react';

import { useHistory } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { GlassCard, Shimmer, ProgressBar } from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: history, isLoading, mutate } = useHistory();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDelete = useCallback(
    async (mediaId: string) => {
      setDeletingId(mediaId);
      try {
        await apiClient.delete(`/progress/${mediaId}`);
        await mutate();
      } catch {
        // ignore
      } finally {
        setDeletingId(null);
      }
    },
    [mutate],
  );

  const handleClearAll = useCallback(async () => {
    setClearing(true);
    try {
      await apiClient.delete('/progress');
      await mutate();
      setShowClearConfirm(false);
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  }, [mutate]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <GlassCard variant="default" padding="lg" className="text-center max-w-sm">
          <Clock size={48} className="text-primary/30 mx-auto mb-4" />
          <p className="text-text-secondary mb-4">请先登录查看观看历史</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            去登录
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="container"
      >
        <motion.div variants={fadeInUp} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Clock size={28} className="text-primary" />
              观看历史
            </h1>
            {history && (
              <p className="text-text-secondary mt-2">共 {history.length} 部</p>
            )}
          </div>
          {history && history.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowClearConfirm(!showClearConfirm)}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                清空全部
              </button>
              <AnimatePresence>
                {showClearConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 glass rounded-xl border border-white/[0.08] shadow-xl shadow-black/40 p-4 z-10"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/80">确定清空所有观看历史？此操作不可撤销。</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleClearAll}
                        disabled={clearing}
                        className="flex-1 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {clearing ? '清空中...' : '确认清空'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/[0.02]">
                <Shimmer variant="rect" className="w-28 h-16 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Shimmer variant="rect" className="h-5 w-48 rounded mb-2" />
                  <Shimmer variant="rect" className="h-3 w-full rounded mb-2" />
                  <Shimmer variant="rect" className="h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && (
          <GlassCard variant="default" padding="lg" className="text-center max-w-sm mx-auto">
            <Clock size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-text-secondary">还没有观看记录</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              去观看
            </button>
          </GlassCard>
        )}

        {!isLoading && history && history.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {history.map((item, index) => {
                const media = item.media;
                if (!media) return null;
                const progressPercent = item.duration > 0
                  ? Math.min((item.progress / item.duration) * 100, 100)
                  : 0;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    variants={fadeInUp}
                    exit={{ opacity: 0, x: -100 }}
                    className="group"
                  >
                    <div className="flex gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {/* Poster */}
                      <div
                        className="relative w-28 h-16 md:w-40 md:h-24 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => router.push(`/watch/${media.id}`)}
                      >
                        {media.posterUrl ? (
                          <img
                            src={media.posterUrl}
                            alt={media.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                            <span className="text-lg font-bold text-white/10">{media.title[0]}</span>
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-8 h-8 bg-primary/90 rounded-full flex items-center justify-center">
                            <Play size={14} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                        {/* Progress bar on poster */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm md:text-base font-medium text-white truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => router.push(`/watch/${media.id}`)}
                        >
                          {media.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                          <span>
                            看到 {formatTime(item.progress)} / {formatTime(item.duration)}
                          </span>
                          <span>{formatRelativeTime(item.lastWatch)}</span>
                        </div>

                        <div className="mt-2 max-w-xs">
                          <ProgressBar value={progressPercent} size="sm" />
                        </div>

                        {item.completed && (
                          <span className="inline-block mt-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            已看完
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => router.push(`/watch/${media.id}`)}
                          className="px-3 py-1.5 text-xs font-medium text-primary hover:text-white hover:bg-primary rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          续播
                        </button>
                        <button
                          onClick={() => handleDelete(media.id)}
                          disabled={deletingId === media.id}
                          className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="删除记录"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

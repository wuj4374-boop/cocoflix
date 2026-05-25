'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';

import { useFavorites } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { MediaCard } from '@/components/media/MediaCard';
import { GlassCard, Shimmer } from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: favorites, isLoading, mutate } = useFavorites();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = useCallback(
    async (mediaId: string) => {
      setRemovingId(mediaId);
      try {
        await apiClient.delete(`/favorites/${mediaId}`);
        await mutate();
      } catch {
        // ignore
      } finally {
        setRemovingId(null);
      }
    },
    [mutate],
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <GlassCard variant="default" padding="lg" className="text-center max-w-sm">
          <Heart size={48} className="text-primary/30 mx-auto mb-4" />
          <p className="text-text-secondary mb-4">请先登录查看收藏</p>
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
        <motion.div variants={fadeInUp} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Heart size={28} className="text-primary" />
            我的收藏
          </h1>
          {favorites && (
            <p className="text-text-secondary mt-2">共 {favorites.length} 部</p>
          )}
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Shimmer variant="card" className="aspect-[2/3] rounded-card mb-2" />
                <Shimmer variant="rect" className="h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!favorites || favorites.length === 0) && (
          <GlassCard variant="default" padding="lg" className="text-center max-w-sm mx-auto">
            <Heart size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-text-secondary">还没有收藏任何内容</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              去发现
            </button>
          </GlassCard>
        )}

        {!isLoading && favorites && favorites.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence>
              {favorites.map((fav, index) => {
                const media = fav.media;
                if (!media) return null;
                return (
                  <motion.div
                    key={fav.id}
                    layout
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div
                      onClick={() => router.push(`/detail/${media.id}`)}
                      className="cursor-pointer"
                    >
                      <MediaCard
                        media={{
                          id: media.id,
                          title: media.title,
                          posterUrl: media.posterUrl,
                          rating: media.rating,
                        }}
                        index={index}
                      />
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(media.id);
                      }}
                      disabled={removingId === media.id}
                      className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white/60 hover:text-red-400 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      title="取消收藏"
                    >
                      <Trash2 size={14} />
                    </button>
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

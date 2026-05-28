'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Play, Heart, Share2, Clock, Calendar, Monitor, Users } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { useMediaDetail, useSourceSearch, useIsFavorite } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import {
  GlassCard,
  GlowButton,
  Badge,
  StarRating,
  Shimmer,
} from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { CastCard } from '@/components/media/CastCard';
import { StillGallery } from '@/components/media/StillGallery';
import { MediaRow } from '@/components/media/MediaRow';
import { SourceList } from '@/components/media/SourceList';
import type { AggregatedSource, AggregatedEpisode } from '@/types/source';

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DetailPage({ params }: DetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: media, isLoading } = useMediaDetail(id);
  const { data: sourceData, isLoading: isSourceLoading } = useSourceSearch(media?.title ?? null);
  const { data: favData, mutate: mutateFav } = useIsFavorite(isAuthenticated ? id : null);
  const [favLoading, setFavLoading] = useState(false);
  const isFavorited = favData?.isFavorite ?? false;

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

  // 取最佳匹配的聚合结果
  const aggregatedResult = sourceData?.results?.[0];
  const aggregatedSources = aggregatedResult?.sources ?? [];
  const aggregatedEpisodes = aggregatedResult?.episodes ?? [];
  const isSeries = aggregatedResult?.isSeries ?? false;
  const actors = aggregatedResult?.actors ?? [];

  const handlePlaySource = (source: AggregatedSource, episode?: AggregatedEpisode) => {
    // 将源信息存入 sessionStorage 供播放页使用
    if (aggregatedResult) {
      sessionStorage.setItem(`source-${id}`, JSON.stringify(aggregatedResult));
    }
    const params = new URLSearchParams();
    if (episode) {
      params.set('episode', String(episode.episodeNumber));
    }
    // 找到源在列表中的索引
    const sourceIdx = aggregatedSources.findIndex((s) => s.sourceId === source.sourceId);
    if (sourceIdx >= 0) {
      params.set('source', String(sourceIdx));
    }
    const qs = params.toString();
    router.push(`/watch/${id}${qs ? `?${qs}` : ''}`);
  };

  if (isLoading) {
    return <DetailLoadingSkeleton />;
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <p className="text-text-secondary">未找到该媒体</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Dynamic blurred background */}
      {media.backdropUrl && (
        <div className="absolute inset-0 h-[700px] overflow-hidden pointer-events-none">
          <Image
            src={media.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover blur-3xl opacity-20 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative container pt-12 pb-20"
      >
        {/* Hero poster section */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-8 mb-16">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-48 md:w-80 aspect-[2/3] rounded-2xl overflow-hidden shadow-cinematic relative">
              {media.posterUrl ? (
                <Image
                  src={media.posterUrl}
                  alt={media.title}
                  fill
                  sizes="(max-width: 768px) 192px, 320px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-background-elevated to-background-secondary flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/10">{media.title[0]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 pt-4">
            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
              {media.title}
            </h1>
            {media.originalTitle && media.originalTitle !== media.title && (
              <p className="text-lg text-white/40 mb-4">{media.originalTitle}</p>
            )}

            {/* Rating */}
            {media.rating && (
              <div className="mb-6">
                <StarRating rating={media.rating} size="lg" showValue />
              </div>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {media.releaseDate && (
                <Badge variant="glass" size="md" icon={<Calendar size={12} />}>
                  {new Date(media.releaseDate).getFullYear()}
                </Badge>
              )}
              {media.duration && (
                <Badge variant="glass" size="md" icon={<Clock size={12} />}>
                  {Math.floor(media.duration / 60)}分钟
                </Badge>
              )}
              {media.genres?.map((genre) => (
                <Badge key={genre.id} variant="default" size="md">
                  {genre.name}
                </Badge>
              ))}
            </div>

            {/* Overview */}
            {media.overview && (
              <GlassCard variant="default" padding="md" className="mb-8">
                <p className="text-white/70 leading-relaxed">{media.overview}</p>
              </GlassCard>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4">
              <GlowButton
                variant="primary"
                size="lg"
                icon={<Play size={20} fill="currentColor" />}
                href={`/watch/${id}`}
              >
                立即播放
              </GlowButton>
              {aggregatedSources.length > 0 && (
                <Badge variant="glass" size="md" icon={<Monitor size={12} />}>
                  {aggregatedSources.length} 个源可用
                </Badge>
              )}
              <GlowButton
                variant="secondary"
                size="lg"
                icon={<Heart size={20} className={isFavorited ? 'fill-primary text-primary' : ''} />}
                onClick={handleToggleFavorite}
                disabled={favLoading}
              >
                {isFavorited ? '已收藏' : '收藏'}
              </GlowButton>
              <GlowButton variant="ghost" size="lg" icon={<Share2 size={20} />}>
                分享
              </GlowButton>
            </div>
          </div>
        </motion.div>

        {/* Cast section */}
        <motion.div variants={fadeInUp} className="mb-16">
          <h2 className="text-xl font-semibold text-white mb-6">演员阵容</h2>
          {actors.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {actors.map((actor, i) => (
                <CastCard key={i} name={actor} />
              ))}
            </div>
          ) : (
            <GlassCard variant="default" padding="md">
              <div className="flex items-center gap-2 text-white/30">
                <Users size={16} />
                <p className="text-sm">暂无演员信息</p>
              </div>
            </GlassCard>
          )}
        </motion.div>

        {/* 播放源 section */}
        <motion.div variants={fadeInUp} className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-white">播放源</h2>
            {aggregatedSources.length > 0 && (
              <Badge variant="glass" size="sm">
                {aggregatedSources.length} 个源
              </Badge>
            )}
          </div>

          {isSourceLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} variant="rect" className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {!isSourceLoading && aggregatedSources.length === 0 && (
            <GlassCard variant="default" padding="md">
              <div className="flex items-center gap-2 text-white/30">
                <Monitor size={16} />
                <p className="text-sm">暂无可用播放源</p>
              </div>
            </GlassCard>
          )}

          {!isSourceLoading && aggregatedSources.length > 0 && (
            <SourceList
              sources={aggregatedSources}
              episodes={aggregatedEpisodes}
              isSeries={isSeries}
              onPlaySource={handlePlaySource}
            />
          )}
        </motion.div>

        {/* Episodes section (for TV shows) */}
        {media.seasons && media.seasons.length > 0 && (
          <motion.div variants={fadeInUp} className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-6">剧集列表</h2>
            <GlassCard variant="default" padding="md">
              {media.seasons.map((season) => (
                <div key={season.id} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-medium text-white mb-4">
                    {season.name || `第 ${season.number} 季`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {season.episodes?.map((ep) => (
                      <a
                        key={ep.id}
                        href={`/watch/${id}?episode=${ep.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium group-hover:bg-primary/20 transition-colors">
                          {ep.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white line-clamp-1">
                            {ep.title || `第 ${ep.number} 集`}
                          </p>
                          {ep.duration && (
                            <p className="text-xs text-white/40 mt-0.5">
                              {Math.floor(ep.duration / 60)}分钟
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </GlassCard>
          </motion.div>
        )}

        {/* Still gallery */}
        <motion.div variants={fadeInUp} className="mb-16">
          <h2 className="text-xl font-semibold text-white mb-6">剧照</h2>
          <StillGallery images={[]} />
        </motion.div>

        {/* Similar media */}
        <motion.div variants={fadeInUp}>
          <MediaRow title="相似推荐" endpoint={`/search/similar/${id}`} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function DetailLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="absolute inset-0 h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-background-secondary" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>

      <div className="relative container pt-12">
        <div className="flex flex-col md:flex-row gap-8">
          <Shimmer variant="rect" className="w-64 md:w-80 aspect-[2/3] rounded-2xl flex-shrink-0" />
          <div className="flex-1 pt-4">
            <Shimmer variant="rect" className="h-12 w-96 max-w-full mb-3 rounded" />
            <Shimmer variant="rect" className="h-5 w-48 mb-6 rounded" />
            <div className="flex gap-2 mb-6">
              <Shimmer variant="rect" className="h-8 w-20 rounded-full" />
              <Shimmer variant="rect" className="h-8 w-16 rounded-full" />
            </div>
            <Shimmer variant="rect" className="h-24 w-full mb-8 rounded-lg" />
            <div className="flex gap-4">
              <Shimmer variant="rect" className="h-12 w-36 rounded-lg" />
              <Shimmer variant="rect" className="h-12 w-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

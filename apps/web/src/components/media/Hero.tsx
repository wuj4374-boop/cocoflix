'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Play, Info, Search } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { useMouseParallax } from '@/hooks/useMouseParallax';
import { GlowButton, Badge, StarRating } from '@/components/ui';
import { useTrending } from '@/hooks/useApi';

interface HeroItem {
  id: string;
  title: string;
  overview: string;
  backdropUrl: string;
  posterUrl?: string;
  rating: number;
  year: number;
  genres: string[];
}

interface HeroProps {
  items?: HeroItem[];
}

const fallbackItems: HeroItem[] = [
  {
    id: 'fallback-1',
    title: 'CocoFlix 私人影院',
    overview: '支持 4K/HDR/HEVC 高画质播放，打造属于你的私人流媒体影院。搜索你想看的影片，即刻开始观影。',
    backdropUrl: '',
    rating: 9.0,
    year: 2024,
    genres: ['4K', 'HDR', '流媒体'],
  },
  {
    id: 'fallback-2',
    title: '极致观影体验',
    overview: '自适应码率切换，智能字幕匹配，多设备同步进度。让每一次观影都成为享受。',
    backdropUrl: '',
    rating: 8.8,
    year: 2024,
    genres: ['高清', '智能', '多端'],
  },
  {
    id: 'fallback-3',
    title: '海量资源聚合',
    overview: '聚合多个资源站，自动匹配最佳画质，一站搜索，全网资源尽在掌握。',
    backdropUrl: '',
    rating: 8.5,
    year: 2024,
    genres: ['聚合', '搜索', '全网'],
  },
];

const heroCrossfadeVariants = {
  initial: { opacity: 0, scale: 1.05 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.8, ease: 'easeIn' },
  },
};

export function Hero({ items: propItems }: HeroProps) {
  const router = useRouter();
  const { data: trendingData } = useTrending();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const parallax = useMouseParallax({ intensity: 25 });

  // Use prop items, or trending data mapped to HeroItem, or fallback
  const items: HeroItem[] = propItems ?? (trendingData && trendingData.length > 0
    ? trendingData.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        overview: t.overview ?? '',
        backdropUrl: t.backdropUrl ?? '',
        posterUrl: t.posterUrl,
        rating: t.rating ?? 0,
        year: t.year ?? new Date().getFullYear(),
        genres: [],
      }))
    : fallbackItems);

  const currentItem = items[currentIndex] ?? items[0];
  const isRealMedia = currentItem && !currentItem.id.startsWith('fallback-');

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(index);
    },
    [],
  );

  // Auto-carousel
  useEffect(() => {
    if (isHovered || items.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, items.length]);

  if (!currentItem) return null;

  return (
    <section
      className="relative h-screen max-h-[900px] min-h-[600px] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Parallax backdrop layer */}
      <motion.div
        className="absolute inset-[-40px]"
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
        }}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={currentItem.id}
            {...heroCrossfadeVariants}
            className="absolute inset-0"
          >
            {currentItem.backdropUrl ? (
              <Image
                src={currentItem.backdropUrl}
                alt={currentItem.title}
                fill
                priority={currentIndex === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-background via-background-secondary to-primary/[0.03]" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute inset-0 gradient-fade-bottom pointer-events-none" />

      {/* Left gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-[#050505]/40 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="absolute bottom-24 md:bottom-32 left-0 right-0 z-10">
        <div className="container">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="max-w-3xl"
            >
              {/* Genre badges */}
              <div className="flex gap-2 mb-4">
                {currentItem.genres.map((g) => (
                  <Badge key={g} variant="glass" size="md">
                    {g}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-hero-sm md:text-hero text-white text-shadow-cinematic mb-4">
                {currentItem.title}
              </h1>

              {/* Metadata row */}
              <div className="flex items-center gap-4 mb-5">
                <StarRating rating={currentItem.rating} size="md" showValue />
                <span className="text-white/60 text-sm">{currentItem.year}</span>
              </div>

              {/* Overview */}
              <p className="text-subtitle text-white/70 max-w-xl mb-8 line-clamp-3">
                {currentItem.overview}
              </p>

              {/* CTA buttons */}
              <div className="flex items-center gap-4">
                {isRealMedia ? (
                  <>
                    <GlowButton
                      variant="primary"
                      size="lg"
                      icon={<Play size={20} fill="currentColor" />}
                      href={`/detail/${currentItem.id}`}
                    >
                      立即播放
                    </GlowButton>
                    <GlowButton
                      variant="secondary"
                      size="lg"
                      icon={<Info size={20} />}
                      href={`/detail/${currentItem.id}`}
                    >
                      详情
                    </GlowButton>
                  </>
                ) : (
                  <GlowButton
                    variant="primary"
                    size="lg"
                    icon={<Search size={20} />}
                    onClick={() => router.push('/search')}
                  >
                    搜索影片
                  </GlowButton>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel indicators */}
          {items.length > 1 && (
            <div className="flex gap-2 mt-8">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-500',
                    i === currentIndex
                      ? 'w-10 bg-primary glow-primary'
                      : 'w-4 bg-white/20 hover:bg-white/40',
                  )}
                  aria-label={`切换到第 ${i + 1} 张`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

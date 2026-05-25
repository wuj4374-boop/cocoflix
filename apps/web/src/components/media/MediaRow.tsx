'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { MediaCard } from './MediaCard';
import { MediaCardSkeleton } from './MediaCardSkeleton';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useApi } from '@/hooks/useApi';

interface MediaItem {
  id: string;
  title: string;
  posterUrl?: string;
  rating?: number;
  year?: number;
  type?: string;
}

interface MediaRowProps {
  title: string;
  endpoint: string;
  items?: MediaItem[];
  isLoading?: boolean;
}

export function MediaRow({ title, endpoint, items, isLoading: isLoadingProp }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const { ref: sectionRef, isIntersecting } = useIntersectionObserver({ triggerOnce: true });

  // 当 items 未传入时，从 endpoint 拉取数据
  const shouldFetch = !items && !!endpoint;
  const { data: fetchedData, isLoading: isFetching } = useApi<
    MediaItem[] | { items: MediaItem[] }
  >(shouldFetch ? endpoint : null, { revalidateOnFocus: false });

  const isLoading = isLoadingProp ?? (shouldFetch && isFetching);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    handleScroll();
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const displayItems = items ?? (Array.isArray(fetchedData) ? fetchedData : fetchedData?.items ?? []);

  return (
    <div ref={sectionRef as React.RefObject<HTMLDivElement>} className="relative mb-12 md:mb-16 group/row">
      {/* Section title */}
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={isIntersecting ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-xl md:text-2xl font-semibold mb-5 px-4 md:px-8 lg:px-12 text-text-primary"
      >
        {title}
      </motion.h2>

      {/* Scroll container */}
      <div className="relative">
        {/* Left fade edge */}
        {showLeftArrow && (
          <div
            className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #050505, transparent)' }}
          />
        )}

        {/* Left arrow */}
        {showLeftArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:bg-white/10"
          >
            <ChevronLeft size={20} className="text-white" />
          </motion.button>
        )}

        {/* Media list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pl-4 md:pl-8 lg:pl-12 pr-8 md:pr-12"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))
            : displayItems.length === 0
              ? (
                <div className="flex items-center justify-center w-full py-12 text-center">
                  <div>
                    <Film size={32} className="mx-auto mb-2 text-white/15" />
                    <p className="text-sm text-white/30">暂无内容，去搜索你想看的影片吧</p>
                  </div>
                </div>
              )
              : displayItems.map((media, index) => (
                <div key={media.id} style={{ scrollSnapAlign: 'start' }}>
                  <MediaCard media={media} index={index} />
                </div>
              ))}
        </div>

        {/* Right fade edge */}
        {showRightArrow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #050505, transparent)' }}
          />
        )}

        {/* Right arrow */}
        {showRightArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:bg-white/10"
          >
            <ChevronRight size={20} className="text-white" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

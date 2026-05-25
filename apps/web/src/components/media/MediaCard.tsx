'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Play, Star } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Shimmer, Badge, StarRating } from '@/components/ui';

interface MediaCardProps {
  media: {
    id: string;
    title: string;
    posterUrl?: string;
    rating?: number;
    year?: number;
    type?: string;
  };
  index?: number;
}

export function MediaCard({ media, index = 0 }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="flex-shrink-0 w-[140px] md:w-[180px] lg:w-[200px] cursor-pointer group/card"
    >
      {/* Poster container */}
      <div className="relative aspect-[2/3] rounded-card overflow-hidden mb-2 bg-background-elevated transition-shadow duration-300 group-hover/card:shadow-lg group-hover/card:shadow-primary/10">
        {/* Skeleton while loading */}
        {!imageLoaded && (
          <Shimmer variant="card" className="absolute inset-0" />
        )}

        {/* Poster image */}
        {media.posterUrl ? (
          <Image
            src={media.posterUrl}
            alt={media.title}
            fill
            sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px"
            loading="lazy"
            className={cn(
              'object-cover transition-all duration-500',
              isHovered ? 'scale-110 brightness-75' : 'scale-100',
              imageLoaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted bg-gradient-to-br from-background-elevated to-background-secondary">
            <span className="text-4xl font-bold text-white/10">{media.title[0]}</span>
          </div>
        )}

        {/* Hover overlay with glassmorphism info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3"
        >
          {/* Play button */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: isHovered ? 1 : 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-12 h-12 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-glow-md">
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </div>
          </motion.div>

          {/* Info card */}
          <div className="glass rounded-lg p-2.5">
            <h3 className="text-sm font-semibold text-white line-clamp-1">
              {media.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {media.rating && (
                <div className="flex items-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-white/70">{media.rating.toFixed(1)}</span>
                </div>
              )}
              {media.year && (
                <span className="text-xs text-white/50">{media.year}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Rating badge (top-right) */}
        {media.rating && (
          <div className="absolute top-2 right-2">
            <Badge variant="glass" size="sm">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              {media.rating.toFixed(1)}
            </Badge>
          </div>
        )}

        {/* Type badge (top-left) */}
        {media.type && (
          <div className="absolute top-2 left-2">
            <Badge variant="primary" size="sm">
              {media.type === 'movie' ? '电影' : media.type === 'tv' ? '电视剧' : '动漫'}
            </Badge>
          </div>
        )}

        {/* Hover glow effect */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none rounded-card"
            style={{
              boxShadow: 'inset 0 0 30px rgba(229,9,20,0.1)',
            }}
          />
        )}
      </div>

      {/* Title below card */}
      <h3 className="text-sm md:text-base font-medium text-text-primary line-clamp-2 group-hover/card:text-primary transition-colors duration-200">
        {media.title}
      </h3>

      {/* Year */}
      {media.year && (
        <p className="text-xs text-text-muted mt-1">{media.year}</p>
      )}
    </motion.div>
  );
}

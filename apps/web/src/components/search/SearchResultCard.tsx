'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Star, Play, Layers } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';
import { Shimmer } from '@/components/ui';
import type { AggregatedResult } from '@/types/source';

interface SearchResultCardProps {
  result: AggregatedResult;
  index?: number;
}

const qualityColorMap: Record<string, string> = {
  '4K': 'bg-yellow-500/90 text-black',
  '2K': 'bg-purple-500/90 text-white',
  '1080P': 'bg-emerald-500/90 text-white',
  '720P': 'bg-blue-500/90 text-white',
  '480P': 'bg-gray-500/90 text-white',
  unknown: 'bg-gray-600/90 text-white/70',
};

export function SearchResultCard({ result, index = 0 }: SearchResultCardProps) {
  const quality = result.bestQuality?.resolution ?? 'unknown';
  const year = result.year;
  const posterLetter = result.title?.[0] ?? '?';
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5), ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link
        href={`/detail/${result.id}`}
        className="group block w-full flex-shrink-0"
      >
        {/* 海报区域 */}
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-background-elevated mb-2 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
          {!imageLoaded && result.poster && (
            <Shimmer variant="card" className="absolute inset-0" />
          )}
          {result.poster ? (
            <Image
              src={result.poster}
              alt={result.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              loading="lazy"
              className={cn(
                'object-cover transition-all duration-500 group-hover:scale-105',
                imageLoaded ? 'opacity-100' : 'opacity-0',
              )}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-background-elevated to-background-secondary flex items-center justify-center">
              <span className="text-4xl font-bold text-white/10">{posterLetter}</span>
            </div>
          )}

          {/* 悬浮遮罩 + 播放按钮 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg shadow-primary/30"
            >
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </motion.div>
          </div>

          {/* 左上角：画质标签 */}
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold leading-none',
                qualityColorMap[quality] ?? qualityColorMap.unknown,
              )}
            >
              {quality}
            </span>
          </div>

          {/* 右上角：评分 */}
          {result.rating != null && result.rating > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-white font-medium">{result.rating.toFixed(1)}</span>
            </div>
          )}

          {/* 左下角：资源数量 */}
          <div className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Layers size={10} className="text-white/70" />
            <span className="text-[10px] text-white/90">{result.totalSources}源</span>
          </div>
        </div>

        {/* 信息区 */}
        <div className="px-0.5">
          <h3 className="text-sm text-white/90 font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {result.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/40">
            {year && <span>{year}</span>}
            {result.isSeries && (
              <span className="px-1 py-0.5 rounded bg-white/[0.06] text-[10px]">剧集</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

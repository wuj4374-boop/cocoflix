'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Film } from 'lucide-react';

import { useSourceSearch } from '@/hooks/useApi';
import { SearchResultCard } from '@/components/search';
import { Shimmer } from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const { data, isLoading } = useSourceSearch(query || null);
  const results = data?.results ?? [];
  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container py-8">
        {/* 搜索头部 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Search size={24} className="text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              搜索：{query}
            </h1>
          </div>
          {stats && !isLoading && (
            <p className="text-sm text-white/40">
              找到 {results.length} 个结果，来自 {stats.successSources} 个资源站
              {stats.totalTime > 0 && `，耗时 ${stats.totalTime}ms`}
            </p>
          )}
        </motion.div>

        {/* 加载态 */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Shimmer variant="rect" className="aspect-[2/3] rounded-xl" />
                <Shimmer variant="rect" className="h-4 w-3/4 rounded" />
                <Shimmer variant="rect" className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && query && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
              <Film size={32} className="text-white/20" />
            </div>
            <p className="text-lg text-white/50 mb-2">未找到 &quot;{query}&quot; 的相关结果</p>
            <p className="text-sm text-white/30">试试其他关键词吧</p>
          </motion.div>
        )}

        {/* 无搜索词 */}
        {!query && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
              <Search size={32} className="text-white/20" />
            </div>
            <p className="text-lg text-white/50 mb-2">输入关键词开始搜索</p>
            <p className="text-sm text-white/30">支持电影、电视剧、动漫名称</p>
          </motion.div>
        )}

        {/* 搜索结果网格 */}
        {!isLoading && results.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {results.map((result, index) => (
              <motion.div key={result.id} variants={fadeInUp}>
                <SearchResultCard result={result} index={index} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pt-20">
        <div className="container py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Shimmer variant="rect" className="aspect-[2/3] rounded-xl" />
                <Shimmer variant="rect" className="h-4 w-3/4 rounded" />
                <Shimmer variant="rect" className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

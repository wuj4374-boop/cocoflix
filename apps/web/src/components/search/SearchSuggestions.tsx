'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Film, Tv, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { useSearchSuggest } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';

interface SuggestItem {
  text: string;
  type?: string;
  posterUrl?: string;
  id?: string;
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (item: SuggestItem) => void;
  visible: boolean;
  className?: string;
}

export function SearchSuggestions({ query, onSelect, visible, className }: SearchSuggestionsProps) {
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useSearchSuggest(visible ? debouncedQuery : null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = data?.suggestions ?? [];

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[activeIndex]);
      }
    },
    [visible, suggestions, activeIndex, onSelect],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!visible || (!isLoading && suggestions.length === 0 && debouncedQuery.length === 0)) {
    return null;
  }

  const showEmpty = !isLoading && debouncedQuery.length >= 1 && suggestions.length === 0;
  const showSuggestions = suggestions.length > 0;
  const showLoading = isLoading && debouncedQuery.length >= 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden z-50',
          className,
        )}
      >
        {/* 加载态 */}
        {showLoading && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-11 rounded bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {showEmpty && (
          <div className="p-6 text-center">
            <Search size={24} className="mx-auto mb-2 text-white/20" />
            <p className="text-sm text-white/40">未找到 &quot;{debouncedQuery}&quot; 的相关结果</p>
          </div>
        )}

        {/* 建议列表 */}
        {showSuggestions && (
          <div className="max-h-80 overflow-y-auto no-scrollbar py-1">
            {suggestions.map((item, index) => (
              <button
                key={`${item.text}-${index}`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left',
                  index === activeIndex ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                )}
              >
                {/* 海报缩略图 */}
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt=""
                    className="w-8 h-11 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-11 rounded bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Film size={14} className="text-white/30" />
                  </div>
                )}

                {/* 文本 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{item.text}</p>
                  {item.type && (
                    <span className="text-xs text-white/40 capitalize">{item.type}</span>
                  )}
                </div>

                {/* 类型图标 */}
                {item.type === 'tv' ? (
                  <Tv size={14} className="text-white/20 flex-shrink-0" />
                ) : item.type === 'anime' ? (
                  <Sparkles size={14} className="text-white/20 flex-shrink-0" />
                ) : (
                  <Film size={14} className="text-white/20 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

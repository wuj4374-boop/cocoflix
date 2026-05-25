'use client';

import { motion } from 'framer-motion';
import { SkipForward, X } from 'lucide-react';

interface NextEpisodeOverlayProps {
  countdown: number;
  title: string;
  onPlayNow: () => void;
  onCancel: () => void;
}

export function NextEpisodeOverlay({
  countdown,
  title,
  onPlayNow,
  onCancel,
}: NextEpisodeOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute bottom-24 right-4 md:right-8 z-40"
    >
      <div className="bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl shadow-black/60 w-[280px] md:w-[320px]">
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 标题 */}
        <p className="text-white/50 text-xs mb-1">即将播放</p>
        <p className="text-white font-medium text-sm mb-4 line-clamp-1">
          {title}
        </p>

        {/* 倒计时环 */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#e50914"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={150.8}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 150.8 }}
                transition={{ duration: countdown, ease: 'linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
              {countdown}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <button
              onClick={onPlayNow}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 active:scale-95"
            >
              <SkipForward className="w-4 h-4" />
              <span className="text-sm">立即播放</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full text-center text-white/40 hover:text-white/70 text-xs mt-2 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

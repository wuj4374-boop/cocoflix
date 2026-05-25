'use client';

import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface PlayerOverlayProps {
  type: 'loading' | 'error';
  message?: string;
  onRetry?: () => void;
}

export function PlayerOverlay({ type, message, onRetry }: PlayerOverlayProps) {
  if (type === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/40"
      >
        {/* 加载动画 - 电影感胶片旋转 */}
        <div className="relative w-16 h-16 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full"
          >
            <Loader2 className="w-full h-full text-primary" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/70 text-sm"
        >
          正在加载...
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-4 max-w-xs text-center"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <p className="text-white font-medium mb-1">播放出错</p>
          <p className="text-white/50 text-sm">{message ?? '视频加载失败'}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-xl transition-all duration-200 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重试</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  animated?: boolean;
  color?: 'primary' | 'white';
}

const sizeStyles = {
  sm: 'h-0.5',
  md: 'h-1',
  lg: 'h-1.5',
};

const colorStyles = {
  primary: 'bg-primary',
  white: 'bg-white',
};

export function ProgressBar({
  value,
  max = 100,
  className,
  size = 'md',
  showGlow = false,
  animated = false,
  color = 'primary',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        'w-full bg-white/10 rounded-full overflow-hidden',
        sizeStyles[size],
        className,
      )}
    >
      <motion.div
        className={cn('h-full rounded-full relative', colorStyles[color])}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          boxShadow: showGlow
            ? color === 'primary'
              ? '0 0 12px rgba(229,9,20,0.5)'
              : '0 0 12px rgba(255,255,255,0.3)'
            : undefined,
        }}
      >
        {animated && (
          <div className="absolute inset-0 shimmer rounded-full" />
        )}
      </motion.div>
    </div>
  );
}

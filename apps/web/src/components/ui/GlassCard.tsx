'use client';

import { cn } from '@/lib/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'light' | 'heavy';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
}

const variantStyles = {
  default: 'bg-white/[0.03] backdrop-blur-[12px] border-white/[0.06]',
  light: 'bg-white/[0.06] backdrop-blur-[20px] border-white/[0.1]',
  heavy: 'bg-white/[0.1] backdrop-blur-[40px] border-white/[0.15]',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function GlassCard({
  children,
  className,
  variant = 'default',
  hover = false,
  padding = 'none',
  as: Component = 'div',
}: GlassCardProps) {
  return (
    <Component
      className={cn(
        'rounded-xl border',
        variantStyles[variant],
        paddingStyles[padding],
        hover && 'transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.12] hover:shadow-glass',
        className,
      )}
    >
      {children}
    </Component>
  );
}

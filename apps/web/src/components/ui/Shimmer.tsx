import { cn } from '@/lib/utils/cn';

interface ShimmerProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card';
}

const variantStyles = {
  text: 'h-4 w-3/4 rounded',
  rect: 'rounded',
  circle: 'rounded-full aspect-square',
  card: 'aspect-[2/3] rounded-card',
};

export function Shimmer({ className, variant = 'rect' }: ShimmerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/[0.04]',
        variantStyles[variant],
        className,
      )}
    >
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

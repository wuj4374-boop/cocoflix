import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRating({
  rating,
  maxRating = 10,
  size = 'md',
  showValue = false,
  className,
}: StarRatingProps) {
  const starCount = 5;
  const normalizedRating = (rating / maxRating) * starCount;
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: starCount }, (_, i) => {
        const fillPercent = Math.min(Math.max((normalizedRating - i) * 100, 0), 100);

        return (
          <div key={i} className="relative">
            {/* Empty star */}
            <Star
              size={iconSize}
              className="text-white/20"
              fill="currentColor"
            />
            {/* Filled portion */}
            {fillPercent > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  size={iconSize}
                  className="text-yellow-400"
                  fill="currentColor"
                />
              </div>
            )}
          </div>
        );
      })}
      {showValue && (
        <span className={cn('ml-1.5 font-medium text-white/80', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

import { Shimmer } from '@/components/ui';
import { MediaCardSkeleton } from './MediaCardSkeleton';

export function MediaRowSkeleton() {
  return (
    <div className="mb-12 md:mb-16 px-4 md:px-8 lg:px-12">
      <Shimmer variant="text" className="h-7 w-48 mb-5" />
      <div className="flex gap-2 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

import { Shimmer } from '@/components/ui';

export function MediaCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[140px] md:w-[180px] lg:w-[200px]">
      <Shimmer variant="card" className="aspect-[2/3] rounded-card mb-2" />
      <Shimmer variant="text" className="h-4 w-3/4 mb-1" />
      <Shimmer variant="text" className="h-3 w-1/3" />
    </div>
  );
}

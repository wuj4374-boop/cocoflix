import { Shimmer } from '@/components/ui';

export function HeroSkeleton() {
  return (
    <div className="relative h-screen max-h-[900px] min-h-[600px] overflow-hidden bg-background-secondary">
      {/* Content skeleton */}
      <div className="absolute bottom-24 md:bottom-32 left-0 right-0">
        <div className="container">
          {/* Genre badges */}
          <div className="flex gap-2 mb-4">
            <Shimmer variant="rect" className="h-6 w-16 rounded-full" />
            <Shimmer variant="rect" className="h-6 w-20 rounded-full" />
          </div>

          {/* Title */}
          <Shimmer variant="rect" className="h-16 w-96 max-w-full mb-4 rounded" />

          {/* Rating row */}
          <div className="flex items-center gap-4 mb-5">
            <Shimmer variant="rect" className="h-5 w-24 rounded" />
            <Shimmer variant="rect" className="h-4 w-12 rounded" />
          </div>

          {/* Description */}
          <Shimmer variant="rect" className="h-4 w-full max-w-xl mb-2 rounded" />
          <Shimmer variant="rect" className="h-4 w-3/4 max-w-xl mb-2 rounded" />
          <Shimmer variant="rect" className="h-4 w-1/2 max-w-xl mb-8 rounded" />

          {/* Buttons */}
          <div className="flex gap-4">
            <Shimmer variant="rect" className="h-12 w-36 rounded-lg" />
            <Shimmer variant="rect" className="h-12 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

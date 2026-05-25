import { Shimmer } from '@/components/ui';

export default function DetailLoading() {
  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Blurred background skeleton */}
      <div className="absolute inset-0 h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-background-secondary" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>

      <div className="relative container pt-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster skeleton */}
          <Shimmer variant="rect" className="w-64 md:w-80 aspect-[2/3] rounded-2xl flex-shrink-0" />

          {/* Metadata skeleton */}
          <div className="flex-1 pt-4">
            <Shimmer variant="rect" className="h-12 w-96 max-w-full mb-3 rounded" />
            <Shimmer variant="rect" className="h-5 w-48 mb-6 rounded" />

            <div className="flex gap-2 mb-6">
              <Shimmer variant="rect" className="h-8 w-20 rounded-full" />
              <Shimmer variant="rect" className="h-8 w-16 rounded-full" />
              <Shimmer variant="rect" className="h-8 w-24 rounded-full" />
            </div>

            <Shimmer variant="rect" className="h-4 w-full mb-2 rounded" />
            <Shimmer variant="rect" className="h-4 w-5/6 mb-2 rounded" />
            <Shimmer variant="rect" className="h-4 w-4/6 mb-8 rounded" />

            <div className="flex gap-4">
              <Shimmer variant="rect" className="h-12 w-36 rounded-lg" />
              <Shimmer variant="rect" className="h-12 w-12 rounded-lg" />
              <Shimmer variant="rect" className="h-12 w-12 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Cast skeleton */}
        <div className="mt-12">
          <Shimmer variant="rect" className="h-7 w-24 mb-6 rounded" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <Shimmer variant="circle" className="w-16 h-16 mx-auto mb-2" />
                <Shimmer variant="text" className="h-3 w-20 mx-auto mb-1" />
                <Shimmer variant="text" className="h-2 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

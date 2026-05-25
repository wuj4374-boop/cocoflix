'use client';

import { cn } from '@/lib/utils/cn';
import { GlassCard } from '@/components/ui';

interface CastCardProps {
  name: string;
  character?: string;
  profilePath?: string;
  className?: string;
}

export function CastCard({ name, character, profilePath, className }: CastCardProps) {
  return (
    <GlassCard hover padding="sm" className={cn('flex-shrink-0 w-28 text-center', className)}>
      <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-background-elevated">
        {profilePath ? (
          <img
            src={profilePath}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xl font-bold">
            {name[0]}
          </div>
        )}
      </div>
      <h4 className="text-xs font-medium text-white line-clamp-1">{name}</h4>
      {character && (
        <p className="text-[10px] text-white/50 line-clamp-1 mt-0.5">{character}</p>
      )}
    </GlassCard>
  );
}

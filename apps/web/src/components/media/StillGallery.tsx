'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';

interface StillGalleryProps {
  images: Array<{
    id: string;
    url: string;
    alt?: string;
  }>;
}

export function StillGallery({ images }: StillGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="break-inside-avoid cursor-pointer group"
            onClick={() => setSelectedIndex(index)}
          >
            <div className="relative rounded-lg overflow-hidden bg-background-elevated">
              <img
                src={image.url}
                alt={image.alt || ''}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Modal
        open={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        size="xl"
      >
        {selectedIndex !== null && images[selectedIndex] && (
          <img
            src={images[selectedIndex].url}
            alt={images[selectedIndex].alt || ''}
            className="w-full h-auto rounded-lg"
          />
        )}
      </Modal>
    </>
  );
}

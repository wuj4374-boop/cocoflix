'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMouseParallaxOptions {
  intensity?: number;
  reverse?: boolean;
}

export function useMouseParallax({
  intensity = 20,
  reverse = false,
}: UseMouseParallaxOptions = {}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const normalizedX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normalizedY = (e.clientY / window.innerHeight - 0.5) * 2;

      mouseRef.current = {
        x: normalizedX * intensity * (reverse ? -1 : 1),
        y: normalizedY * intensity * (reverse ? -1 : 1),
      };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setOffset(mouseRef.current);
          rafRef.current = null;
        });
      }
    },
    [intensity, reverse],
  );

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return offset;
}

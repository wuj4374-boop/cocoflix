'use client';

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: (x: number) => void;
  onSingleTap?: () => void;
  onVerticalDrag?: (direction: 'up' | 'down', delta: number) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export class GestureHandler {
  private element: HTMLElement;
  private callbacks: GestureCallbacks;
  private startTouch: TouchPoint | null = null;
  private lastTapTime = 0;
  private lastTapX = 0;
  private tapTimeout: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  private onTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (!touch) return;
    this.startTouch = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.startTouch) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.startTouch.x;
    const deltaY = touch.clientY - this.startTouch.y;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
      e.preventDefault();
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (!this.startTouch) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const endTouch = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    const deltaX = endTouch.x - this.startTouch.x;
    const deltaY = endTouch.y - this.startTouch.y;
    const deltaTime = endTouch.time - this.startTouch.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 10 && deltaTime < 300) {
      this.handleTap(endTouch.x);
    } else if (distance > 50 && deltaTime < 500) {
      this.handleSwipe(deltaX, deltaY, distance);
    } else if (Math.abs(deltaY) > 30 && deltaTime < 800) {
      const direction = deltaY < 0 ? 'up' : 'down';
      this.callbacks.onVerticalDrag?.(direction, Math.abs(deltaY));
    }

    this.startTouch = null;
  };

  private handleTap(x: number): void {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;
    const distanceFromLastTap = Math.abs(x - this.lastTapX);

    if (timeSinceLastTap < 300 && distanceFromLastTap < 50) {
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
        this.tapTimeout = null;
      }
      this.callbacks.onDoubleTap?.(x);
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapX = x;
      this.tapTimeout = setTimeout(() => {
        this.callbacks.onSingleTap?.();
        this.tapTimeout = null;
      }, 300);
    }
  }

  private handleSwipe(deltaX: number, deltaY: number, distance: number): void {
    const minDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (distance < minDistance) return;
      if (deltaX > 0) {
        this.callbacks.onSwipeRight?.();
      } else {
        this.callbacks.onSwipeLeft?.();
      }
    } else {
      if (distance < minDistance) return;
      if (deltaY > 0) {
        this.callbacks.onSwipeDown?.();
      } else {
        this.callbacks.onSwipeUp?.();
      }
    }
  }

  destroy(): void {
    this.isActive = false;
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    if (this.tapTimeout) clearTimeout(this.tapTimeout);
  }
}

'use client';

interface ShortcutCallbacks {
  togglePlay?: () => void;
  seekForward?: (seconds: number) => void;
  seekBackward?: (seconds: number) => void;
  volumeUp?: () => void;
  volumeDown?: () => void;
  toggleMute?: () => void;
  toggleFullscreen?: () => void;
  toggleCinemaMode?: () => void;
  togglePip?: () => void;
  nextEpisode?: () => void;
  prevEpisode?: () => void;
  increaseSpeed?: () => void;
  decreaseSpeed?: () => void;
  toggleSubtitle?: () => void;
}

export class KeyboardShortcuts {
  private callbacks: ShortcutCallbacks;
  private isEnabled = true;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor(callbacks: ShortcutCallbacks) {
    this.callbacks = callbacks;
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    document.addEventListener('keydown', this.boundHandler);
  }

  disable(): void {
    this.isEnabled = false;
    document.removeEventListener('keydown', this.boundHandler);
  }

  start(): void {
    document.addEventListener('keydown', this.boundHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.callbacks.togglePlay?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.callbacks.seekBackward?.(e.shiftKey ? 30 : 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.callbacks.seekForward?.(e.shiftKey ? 30 : 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.callbacks.volumeUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.callbacks.volumeDown?.();
        break;
      case 'KeyF':
        e.preventDefault();
        this.callbacks.toggleFullscreen?.();
        break;
      case 'KeyM':
        e.preventDefault();
        this.callbacks.toggleMute?.();
        break;
      case 'KeyP':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.callbacks.togglePip?.();
        }
        break;
      case 'KeyC':
        e.preventDefault();
        this.callbacks.toggleCinemaMode?.();
        break;
      case 'BracketRight':
        e.preventDefault();
        this.callbacks.increaseSpeed?.();
        break;
      case 'BracketLeft':
        e.preventDefault();
        this.callbacks.decreaseSpeed?.();
        break;
      case 'KeyN':
        e.preventDefault();
        this.callbacks.nextEpisode?.();
        break;
      case 'KeyB':
        e.preventDefault();
        this.callbacks.prevEpisode?.();
        break;
      case 'KeyS':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.callbacks.toggleSubtitle?.();
        }
        break;
    }
  }

  destroy(): void {
    document.removeEventListener('keydown', this.boundHandler);
  }
}

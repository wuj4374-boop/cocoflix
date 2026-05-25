'use client';

import { apiClient } from '@/lib/api/client';

const PROGRESS_KEY = 'coco_progress';
const SYNC_INTERVAL = 10_000;
const LOCAL_SAVE_INTERVAL = 3_000;

interface LocalProgress {
  mediaId: string;
  episodeId?: string;
  progress: number;
  duration: number;
  timestamp: number;
}

export class ProgressSync {
  private mediaId: string;
  private episodeId?: string;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private localSaveTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncedProgress = 0;
  private videoElement: HTMLVideoElement;
  private isDestroyed = false;

  constructor(
    videoElement: HTMLVideoElement,
    mediaId: string,
    episodeId?: string,
  ) {
    this.videoElement = videoElement;
    this.mediaId = mediaId;
    this.episodeId = episodeId;
  }

  start(): void {
    this.syncTimer = setInterval(() => this.syncToServer(), SYNC_INTERVAL);
    this.localSaveTimer = setInterval(() => this.saveToLocal(), LOCAL_SAVE_INTERVAL);

    this.videoElement.addEventListener('pause', () => this.saveToLocal());
    this.videoElement.addEventListener('ended', () => this.markCompleted());
  }

  private saveToLocal(): void {
    if (this.isDestroyed) return;
    try {
      const all = this.loadAllLocal();
      const key = this.episodeId
        ? `${this.mediaId}:${this.episodeId}`
        : this.mediaId;
      all[key] = {
        mediaId: this.mediaId,
        episodeId: this.episodeId,
        progress: this.videoElement.currentTime,
        duration: this.videoElement.duration,
        timestamp: Date.now(),
      };

      const keys = Object.keys(all);
      if (keys.length > 50) {
        const sorted = keys.sort(
          (a, b) => (all[b]?.timestamp ?? 0) - (all[a]?.timestamp ?? 0),
        );
        for (const k of sorted.slice(50)) {
          delete all[k];
        }
      }

      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
      // localStorage quota or SSR
    }
  }

  private async syncToServer(): Promise<void> {
    if (this.isDestroyed) return;
    const currentTime = this.videoElement.currentTime;
    const duration = this.videoElement.duration;

    if (
      !duration ||
      !isFinite(duration) ||
      Math.abs(currentTime - this.lastSyncedProgress) < 5
    ) {
      return;
    }

    try {
      await apiClient.put(`/progress/${this.mediaId}`, {
        episodeId: this.episodeId,
        progress: Math.floor(currentTime),
        duration: Math.floor(duration),
      });
      this.lastSyncedProgress = currentTime;
    } catch {
      // silently fail - will retry next interval
    }
  }

  private async markCompleted(): Promise<void> {
    try {
      await apiClient.put(`/progress/${this.mediaId}`, {
        episodeId: this.episodeId,
        progress: Math.floor(this.videoElement.duration),
        duration: Math.floor(this.videoElement.duration),
      });
    } catch {
      // silently fail
    }
  }

  getSavedProgress(): number {
    try {
      const all = this.loadAllLocal();
      const key = this.episodeId
        ? `${this.mediaId}:${this.episodeId}`
        : this.mediaId;
      const saved = all[key];
      if (saved && Date.now() - saved.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return saved.progress;
      }
    } catch {
      // SSR
    }
    return 0;
  }

  async fetchServerProgress(): Promise<number> {
    try {
      const res = (await apiClient.get(
        `/progress/${this.mediaId}${this.episodeId ? `?episodeId=${this.episodeId}` : ''}`,
      )) as unknown as { progress: number } | null;
      return res?.progress ?? 0;
    } catch {
      // fallback to local
    }
    return 0;
  }

  private loadAllLocal(): Record<string, LocalProgress> {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.localSaveTimer) clearInterval(this.localSaveTimer);
    this.saveToLocal();
    this.syncToServer();
  }
}

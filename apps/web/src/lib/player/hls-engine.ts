'use client';

import Hls, { HlsConfig } from 'hls.js';
import type { QualityLevel } from '@/types/player';

const HLS_CONFIG: Partial<HlsConfig> = {
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  backBufferLength: 30,
  startLevel: -1,
  abrEwmaDefaultEstimate: 5_000_000,
  abrBandWidthFactor: 0.95,
  abrBandWidthUpFactor: 0.7,
  enableWorker: true,
  lowLatencyMode: false,
  maxLoadingDelay: 4,
  maxBufferHole: 0.5,
  fragLoadingTimeOut: 20_000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1_000,
};

export interface HlsEngineOptions {
  videoElement: HTMLVideoElement;
  url: string;
  qualities: QualityLevel[];
  onQualityChange?: (level: number) => void;
  onError?: (error: string) => void;
  onLevelSwitch?: (level: number, data: { width: number; height: number }) => void;
}

export class HlsEngine {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement;
  private qualities: QualityLevel[];
  private currentLevel = -1;
  private onErrorCallback?: (error: string) => void;
  private onLevelSwitchCallback?: (level: number, data: { width: number; height: number }) => void;

  constructor(options: HlsEngineOptions) {
    this.videoElement = options.videoElement;
    this.qualities = options.qualities;
    this.onErrorCallback = options.onError;
    this.onLevelSwitchCallback = options.onLevelSwitch;
  }

  get isSupported(): boolean {
    return Hls.isSupported();
  }

  get instance(): Hls | null {
    return this.hls;
  }

  load(url: string): void {
    this.destroy();

    if (!Hls.isSupported()) {
      this.handleNativeFallback(url);
      return;
    }

    this.hls = new Hls(HLS_CONFIG);

    this.hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      this.mapQualitiesToLevels(data.levels);
      if (this.currentLevel === -1) {
        this.hls!.startLevel = -1;
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const level = this.hls!.levels[data.level];
      if (level) {
        this.onLevelSwitchCallback?.(data.level, {
          width: level.width,
          height: level.height,
        });
      }
    });

    this.hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.hls?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.hls?.recoverMediaError();
            break;
          default:
            this.onErrorCallback?.(`播放错误: ${data.details}`);
            this.destroy();
            break;
        }
      }
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(this.videoElement);
  }

  private handleNativeFallback(url: string): void {
    if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      this.videoElement.src = url;
    } else {
      this.onErrorCallback?.('浏览器不支持HLS播放');
    }
  }

  private mapQualitiesToLevels(hlsLevels: { width: number; height: number; bitrate: number }[]): void {
    const mapped = hlsLevels.map((level, index) => {
      const matched = this.qualities.find(
        (q) => q.height === level.height || Math.abs(q.height - level.height) < 50,
      );
      return {
        index,
        label: matched?.label ?? `${level.height}P`,
        height: level.height,
      };
    });

    void mapped;
  }

  setQuality(levelIndex: number): void {
    if (!this.hls) return;
    this.currentLevel = levelIndex;
    this.hls.currentLevel = levelIndex;
  }

  setAutoQuality(): void {
    if (!this.hls) return;
    this.currentLevel = -1;
    this.hls.currentLevel = -1;
  }

  get currentQualityLevel(): number {
    return this.currentLevel;
  }

  get isAutoQuality(): boolean {
    return this.currentLevel === -1;
  }

  get availableLevels(): { index: number; width: number; height: number; bitrate: number }[] {
    if (!this.hls) return [];
    return this.hls.levels.map((level, index) => ({
      index,
      width: level.width,
      height: level.height,
      bitrate: level.bitrate,
    }));
  }

  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.currentLevel = -1;
  }
}

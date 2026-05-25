import type Artplayer from 'artplayer';
import type Hls from 'hls.js';

// ============ 播放器核心类型 ============
export interface PlayerSource {
  url: string;
  type: 'm3u8' | 'mp4' | 'webm';
  quality?: string;
}

export interface QualityLevel {
  label: string;
  value: string;
  width: number;
  height: number;
  bitrate: number;
  url: string;
  default?: boolean;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  type: 'ass' | 'vtt' | 'srt';
  default?: boolean;
}

export interface AudioTrack {
  id: string;
  label: string;
  language: string;
  default?: boolean;
}

export interface EpisodeInfo {
  id: string;
  number: number;
  title?: string;
  overview?: string;
  duration?: number;
  thumbnailUrl?: string;
  hlsPath?: string;
  seasonNumber?: number;
}

export interface SeasonInfo {
  id: string;
  number: number;
  name?: string;
  episodes: EpisodeInfo[];
}

export interface MediaInfo {
  id: string;
  title: string;
  originalTitle?: string;
  type: string;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  seasons?: SeasonInfo[];
}

// ============ 播放器配置 ============
export interface PlayerConfig {
  mediaId: string;
  episodeId?: string;
  title: string;
  sources: QualityLevel[];
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
  poster?: string;
  autoplay?: boolean;
  startTime?: number;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
}

// ============ 播放器状态 ============
export type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerStatus {
  state: PlayState;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isCinemaMode: boolean;
  playbackRate: number;
  currentQuality: string;
  currentSubtitle: string | null;
  currentAudioTrack: string | null;
  error: string | null;
}

// ============ 手势类型 ============
export interface GestureState {
  isSwiping: boolean;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

// ============ ArtPlayer 扩展类型 ============
export type ArtplayerInstance = Artplayer;
export type HlsInstance = Hls;

declare module 'artplayer' {
  interface Artplayer {
    hls?: Hls;
    subtitle?: {
      switch: (track: SubtitleTrack) => void;
      destroy: () => void;
    };
  }
}

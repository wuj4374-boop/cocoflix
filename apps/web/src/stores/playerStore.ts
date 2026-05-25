import { create } from 'zustand';
import type { QualityLevel, SubtitleTrack, AudioTrack, PlayState } from '@/types/player';

interface PlayerState {
  // 播放状态
  state: PlayState;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isCinemaMode: boolean;
  playbackRate: number;
  error: string | null;

  // 清晰度
  currentQuality: string;
  availableQualities: QualityLevel[];
  isAutoQuality: boolean;

  // 字幕
  currentSubtitle: string | null;
  availableSubtitles: SubtitleTrack[];

  // 音轨
  currentAudioTrack: string | null;
  availableAudioTracks: AudioTrack[];

  // 控制器可见性
  controlsVisible: boolean;
  controlsTimeout: ReturnType<typeof setTimeout> | null;

  // 剧集信息
  hasNextEpisode: boolean;
  hasPrevEpisode: boolean;
  showNextEpisodePrompt: boolean;
  nextEpisodeCountdown: number;

  // 画中画
  isPip: boolean;

  // Actions
  setState: (state: PlayState) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleCinemaMode: () => void;
  setPlaybackRate: (rate: number) => void;
  cyclePlaybackRate: (direction: 'up' | 'down') => void;
  setError: (error: string | null) => void;

  setQuality: (quality: string) => void;
  setAvailableQualities: (qualities: QualityLevel[]) => void;
  setAutoQuality: (auto: boolean) => void;

  setSubtitle: (subtitleId: string | null) => void;
  setAvailableSubtitles: (subtitles: SubtitleTrack[]) => void;

  setAudioTrack: (trackId: string | null) => void;
  setAvailableAudioTracks: (tracks: AudioTrack[]) => void;

  showControls: () => void;
  hideControls: () => void;
  toggleControls: () => void;

  setHasNextEpisode: (has: boolean) => void;
  setHasPrevEpisode: (has: boolean) => void;
  setShowNextEpisodePrompt: (show: boolean) => void;
  setNextEpisodeCountdown: (seconds: number) => void;

  setPip: (pip: boolean) => void;

  reset: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const initialState = {
  state: 'idle' as PlayState,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  isCinemaMode: false,
  playbackRate: 1,
  error: null,
  currentQuality: '1080p',
  availableQualities: [] as QualityLevel[],
  isAutoQuality: true,
  currentSubtitle: null,
  availableSubtitles: [] as SubtitleTrack[],
  currentAudioTrack: null,
  availableAudioTracks: [] as AudioTrack[],
  controlsVisible: true,
  controlsTimeout: null as ReturnType<typeof setTimeout> | null,
  hasNextEpisode: false,
  hasPrevEpisode: false,
  showNextEpisodePrompt: false,
  nextEpisodeCountdown: 0,
  isPip: false,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  setState: (state) => set({ state }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setBuffered: (buffered) => set({ buffered }),
  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },
  toggleMute: () => {
    const { isMuted, volume } = get();
    if (isMuted) {
      set({ isMuted: false, volume: volume === 0 ? 0.5 : volume });
    } else {
      set({ isMuted: true });
    }
  },
  setMuted: (isMuted) => set({ isMuted }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  toggleCinemaMode: () => set((s) => ({ isCinemaMode: !s.isCinemaMode })),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  cyclePlaybackRate: (direction) => {
    const { playbackRate } = get();
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    if (direction === 'up' && idx < PLAYBACK_RATES.length - 1) {
      set({ playbackRate: PLAYBACK_RATES[idx + 1] });
    } else if (direction === 'down' && idx > 0) {
      set({ playbackRate: PLAYBACK_RATES[idx - 1] });
    }
  },
  setError: (error) => set({ error, state: error ? 'error' : get().state }),

  setQuality: (currentQuality) => set({ currentQuality }),
  setAvailableQualities: (availableQualities) => set({ availableQualities }),
  setAutoQuality: (isAutoQuality) => set({ isAutoQuality }),

  setSubtitle: (currentSubtitle) => set({ currentSubtitle }),
  setAvailableSubtitles: (availableSubtitles) => set({ availableSubtitles }),

  setAudioTrack: (currentAudioTrack) => set({ currentAudioTrack }),
  setAvailableAudioTracks: (availableAudioTracks) => set({ availableAudioTracks }),

  showControls: () => {
    const { controlsTimeout } = get();
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      set({ controlsVisible: false, controlsTimeout: null });
    }, 3000);
    set({ controlsVisible: true, controlsTimeout: timeout });
  },
  hideControls: () => {
    const { controlsTimeout } = get();
    if (controlsTimeout) clearTimeout(controlsTimeout);
    set({ controlsVisible: false, controlsTimeout: null });
  },
  toggleControls: () => {
    const { controlsVisible } = get();
    if (controlsVisible) {
      get().hideControls();
    } else {
      get().showControls();
    }
  },

  setHasNextEpisode: (hasNextEpisode) => set({ hasNextEpisode }),
  setHasPrevEpisode: (hasPrevEpisode) => set({ hasPrevEpisode }),
  setShowNextEpisodePrompt: (showNextEpisodePrompt) => set({ showNextEpisodePrompt }),
  setNextEpisodeCountdown: (nextEpisodeCountdown) => set({ nextEpisodeCountdown }),

  setPip: (isPip) => set({ isPip }),

  reset: () => {
    const { controlsTimeout } = get();
    if (controlsTimeout) clearTimeout(controlsTimeout);
    set(initialState);
  },
}));

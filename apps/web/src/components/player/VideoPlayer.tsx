'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

import { usePlayerStore } from '@/stores/playerStore';
import { HlsEngine } from '@/lib/player/hls-engine';
import { SubtitleEngine } from '@/lib/player/subtitle-engine';
import { ProgressSync } from '@/lib/player/progress-sync';
import { GestureHandler } from '@/lib/player/gesture-handler';
import { KeyboardShortcuts } from '@/lib/player/keyboard-shortcuts';
import type { PlayerConfig, QualityLevel, SubtitleTrack } from '@/types/player';

import { PlayerControls } from './PlayerControls';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { PlayerOverlay } from './PlayerOverlay';

interface VideoPlayerProps {
  config: PlayerConfig;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function VideoPlayer({ config, className }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<HlsEngine | null>(null);
  const subtitleRef = useRef<SubtitleEngine | null>(null);
  const progressRef = useRef<ProgressSync | null>(null);
  const gestureRef = useRef<GestureHandler | null>(null);
  const shortcutRef = useRef<KeyboardShortcuts | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextEpisodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showBigPlay, setShowBigPlay] = useState(true);
  const [seekPreview, setSeekPreview] = useState<{
    time: number;
    x: number;
    visible: boolean;
  }>({ time: 0, x: 0, visible: false });

  const store = usePlayerStore();

  // 初始化 ArtPlayer
  const initPlayer = useCallback(() => {
    if (!containerRef.current || artRef.current) return;

    const art = new Artplayer({
      container: containerRef.current,
      url: '',
      type: 'm3u8',
      autoplay: config.autoplay ?? false,
      autoSize: false,
      autoMini: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      screenshot: true,
      hotkey: false,
      pip: true,
      mutex: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      setting: true,
      settings: [
        {
          html: '画质',
          width: 200,
          selector: config.sources.map((s) => ({
            html: s.label,
            default: s.value === store.currentQuality,
          })),
          onSelect: (item: { html: string; default?: boolean }) => {
            const quality = config.sources.find((s) => s.label === item.html);
            if (quality) {
              store.setQuality(quality.value);
              switchQuality(quality);
            }
            return item.html;
          },
        },
      ],
      controls: [],
      layers: [],
      icons: {},
      theme: '#e50914',
      volume: store.volume,
      muted: store.isMuted,
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
    });

    artRef.current = art;

    // HLS 引擎初始化
    const hlsEngine = new HlsEngine({
      videoElement: art.video,
      url: '',
      qualities: config.sources,
      onLevelSwitch: (_level, data) => {
        store.setQuality(`${data.height}p`);
      },
      onError: (err) => {
        store.setError(err);
      },
    });

    if (hlsEngine.isSupported) {
      hlsRef.current = hlsEngine;
    }

    // 字幕引擎
    const subtitleEngine = new SubtitleEngine(art.video);
    if (containerRef.current) {
      subtitleEngine.init(containerRef.current);
    }
    subtitleRef.current = subtitleEngine;

    // 进度同步
    const progressSync = new ProgressSync(
      art.video,
      config.mediaId,
      config.episodeId,
    );
    progressRef.current = progressSync;

    // 加载默认源
    const defaultSource =
      config.sources.find((s) => s.value === store.currentQuality) ??
      config.sources[0];
    if (defaultSource) {
      loadSource(defaultSource.url);
    }

    // 加载字幕
    if (config.subtitles?.length) {
      store.setAvailableSubtitles(config.subtitles);
      const defaultSub =
        config.subtitles.find((s) => s.default) ?? config.subtitles[0];
      if (defaultSub) {
        subtitleEngine.loadTrack(defaultSub);
        store.setSubtitle(defaultSub.id);
      }
    }

    // 音轨
    if (config.audioTracks?.length) {
      store.setAvailableAudioTracks(config.audioTracks);
      const defaultTrack =
        config.audioTracks.find((t) => t.default) ?? config.audioTracks[0];
      if (defaultTrack) store.setAudioTrack(defaultTrack.id);
    }

    // 剧集状态
    store.setHasNextEpisode(config.hasNextEpisode ?? false);
    store.setHasPrevEpisode(config.hasPrevEpisode ?? false);

    // 恢复进度
    const savedProgress = progressSync.getSavedProgress();
    if (savedProgress > 0 && config.startTime === undefined) {
      art.once('video:canplay', () => {
        art.currentTime = savedProgress;
      });
    } else if (config.startTime && config.startTime > 0) {
      art.once('video:canplay', () => {
        art.currentTime = config.startTime!;
      });
    }

    // 启动进度同步
    progressSync.start();

    // 注册 ArtPlayer 事件
    registerArtEvents(art);
  }, [config, store]);

  const loadSource = useCallback(
    (url: string) => {
      const art = artRef.current;
      const hls = hlsRef.current;
      if (!art || !hls) return;

      setIsLoading(true);
      store.setState('loading');
      store.setError(null);

      if (Hls.isSupported()) {
        hls.load(url);
      } else if (art.video.canPlayType('application/vnd.apple.mpegurl')) {
        art.video.src = url;
      }

      art.url = url;
    },
    [store],
  );

  const switchQuality = useCallback(
    (quality: QualityLevel) => {
      const art = artRef.current;
      const hls = hlsRef.current;
      if (!art) return;

      const currentTime = art.currentTime;
      const wasPlaying = art.playing;

      if (hls) {
        const levels = hls.availableLevels;
        const targetLevel = levels.find(
          (l) => Math.abs(l.height - quality.height) < 50,
        );
        if (targetLevel) {
          hls.setQuality(targetLevel.index);
        } else {
          loadSource(quality.url);
        }
      } else {
        loadSource(quality.url);
      }

      art.once('video:canplay', () => {
        art.currentTime = currentTime;
        if (wasPlaying) art.play();
      });

      store.setQuality(quality.value);
      store.setAutoQuality(false);
    },
    [store, loadSource],
  );

  const registerArtEvents = useCallback(
    (art: Artplayer) => {
      art.on('video:timeupdate', () => {
        store.setCurrentTime(art.currentTime);
      });

      art.on('video:durationchange', () => {
        store.setDuration(art.duration);
      });

      art.on('video:progress', () => {
        if (art.video.buffered.length > 0) {
          store.setBuffered(
            art.video.buffered.end(art.video.buffered.length - 1),
          );
        }
      });

      art.on('video:volumechange', () => {
        store.setVolume(art.volume);
        store.setMuted(art.muted);
      });

      art.on('video:playing', () => {
        store.setState('playing');
        setIsLoading(false);
        setShowBigPlay(false);
      });

      art.on('video:pause', () => {
        store.setState('paused');
      });

      art.on('video:waiting', () => {
        setIsLoading(true);
      });

      art.on('video:canplay', () => {
        setIsLoading(false);
      });

      art.on('video:ended', () => {
        store.setState('ended');
        if (config.onNextEpisode && store.hasNextEpisode) {
          startNextEpisodeCountdown();
        }
      });

      art.on('video:error', () => {
        store.setError('视频加载失败，请稍后重试');
        store.setState('error');
      });

      art.on('fullscreen', (state: boolean) => {
        store.setFullscreen(state);
      });

      art.on('fullscreenWeb', (state: boolean) => {
        store.setFullscreen(state);
      });
    },
    [store, config],
  );

  const startNextEpisodeCountdown = useCallback(() => {
    store.setShowNextEpisodePrompt(true);
    store.setNextEpisodeCountdown(8);

    let countdown = 8;
    const tick = () => {
      countdown--;
      store.setNextEpisodeCountdown(countdown);
      if (countdown <= 0) {
        config.onNextEpisode?.();
        store.setShowNextEpisodePrompt(false);
      } else {
        nextEpisodeTimerRef.current = setTimeout(tick, 1000);
      }
    };

    nextEpisodeTimerRef.current = setTimeout(tick, 1000);
  }, [store, config]);

  const cancelNextEpisode = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearTimeout(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    store.setShowNextEpisodePrompt(false);
    store.setNextEpisodeCountdown(0);
  }, [store]);

  // 手势初始化
  useEffect(() => {
    if (!containerRef.current) return;

    const gestureHandler = new GestureHandler(containerRef.current, {
      onSingleTap: () => {
        store.toggleControls();
      },
      onDoubleTap: (x) => {
        const art = artRef.current;
        if (!art) return;
        const rect = containerRef.current!.getBoundingClientRect();
        const relX = x - rect.left;
        if (relX < rect.width / 3) {
          art.currentTime = Math.max(0, art.currentTime - 10);
        } else if (relX > (rect.width * 2) / 3) {
          art.currentTime = Math.min(art.duration, art.currentTime + 10);
        } else {
          togglePlay();
        }
      },
      onSwipeLeft: () => {
        const art = artRef.current;
        if (art) art.currentTime = Math.max(0, art.currentTime - 15);
      },
      onSwipeRight: () => {
        const art = artRef.current;
        if (art) art.currentTime = Math.min(art.duration, art.currentTime + 15);
      },
      onSwipeUp: () => {
        store.setVolume(store.volume + 0.1);
        const art = artRef.current;
        if (art) art.volume = store.volume;
      },
      onSwipeDown: () => {
        store.setVolume(store.volume - 0.1);
        const art = artRef.current;
        if (art) art.volume = store.volume;
      },
    });

    gestureHandler.activate();
    gestureRef.current = gestureHandler;

    return () => gestureHandler.destroy();
  }, [store]);

  // 快捷键初始化
  useEffect(() => {
    const shortcuts = new KeyboardShortcuts({
      togglePlay,
      seekForward: (s) => {
        const art = artRef.current;
        if (art) art.currentTime = Math.min(art.duration, art.currentTime + s);
      },
      seekBackward: (s) => {
        const art = artRef.current;
        if (art) art.currentTime = Math.max(0, art.currentTime - s);
      },
      volumeUp: () => {
        const newVol = Math.min(1, store.volume + 0.05);
        store.setVolume(newVol);
        const art = artRef.current;
        if (art) art.volume = newVol;
      },
      volumeDown: () => {
        const newVol = Math.max(0, store.volume - 0.05);
        store.setVolume(newVol);
        const art = artRef.current;
        if (art) art.volume = newVol;
      },
      toggleMute: () => {
        store.toggleMute();
        const art = artRef.current;
        if (art) art.muted = store.isMuted;
      },
      toggleFullscreen,
      toggleCinemaMode: () => store.toggleCinemaMode(),
      togglePip: () => {
        const art = artRef.current;
        if (art) art.pip = !art.pip;
      },
      nextEpisode: () => config.onNextEpisode?.(),
      prevEpisode: () => config.onPrevEpisode?.(),
      increaseSpeed: () => {
        store.cyclePlaybackRate('up');
        const art = artRef.current;
        if (art) art.playbackRate = usePlayerStore.getState().playbackRate;
      },
      decreaseSpeed: () => {
        store.cyclePlaybackRate('down');
        const art = artRef.current;
        if (art) art.playbackRate = usePlayerStore.getState().playbackRate;
      },
      toggleSubtitle: () => {
        const subs = store.availableSubtitles;
        if (!subs.length) return;
        const current = store.currentSubtitle;
        const idx = subs.findIndex((s) => s.id === current);
        const next = subs[(idx + 1) % subs.length];
        if (next) switchSubtitle(next);
      },
    });

    shortcuts.start();
    shortcutRef.current = shortcuts;

    return () => shortcuts.destroy();
  }, [store, config]);

  // 初始化播放器
  useEffect(() => {
    initPlayer();

    return () => {
      subtitleRef.current?.destroy();
      progressRef.current?.destroy();
      gestureRef.current?.destroy();
      shortcutRef.current?.destroy();
      hlsRef.current?.destroy();
      artRef.current?.destroy();
      artRef.current = null;
      if (nextEpisodeTimerRef.current) clearTimeout(nextEpisodeTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const art = artRef.current;
    if (!art) return;
    if (art.playing) {
      art.pause();
    } else {
      art.play();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  }, []);

  const switchSubtitle = useCallback(
    (track: SubtitleTrack) => {
      const engine = subtitleRef.current;
      if (!engine) return;
      engine.loadTrack(track);
      store.setSubtitle(track.id);
    },
    [store],
  );

  const handleSeek = useCallback(
    (time: number) => {
      const art = artRef.current;
      if (art) {
        art.currentTime = time;
        store.setCurrentTime(time);
      }
    },
    [store],
  );

  const handleSpeedChange = useCallback(
    (speed: number) => {
      store.setPlaybackRate(speed);
      const art = artRef.current;
      if (art) art.playbackRate = speed;
    },
    [store],
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black select-none ${className ?? ''}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* 电影感渐变遮罩 */}
      <AnimatePresence>
        {store.controlsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* 加载指示器 */}
      <AnimatePresence>
        {isLoading && store.state !== 'error' && (
          <PlayerOverlay type="loading" />
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {store.state === 'error' && (
          <PlayerOverlay
            type="error"
            message={store.error ?? '播放出错'}
            onRetry={() => {
              const defaultSource = config.sources[0];
              if (defaultSource) {
                store.setState('loading');
                setIsLoading(true);
                loadSource(defaultSource.url);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 大播放按钮 */}
      <AnimatePresence>
        {showBigPlay && store.state !== 'error' && !isLoading && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-primary/30 transition-transform hover:scale-110">
              <svg
                viewBox="0 0 24 24"
                fill="white"
                className="w-8 h-8 md:w-10 md:h-10 ml-1"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 下一集提示 */}
      <AnimatePresence>
        {store.showNextEpisodePrompt && (
          <NextEpisodeOverlay
            countdown={store.nextEpisodeCountdown}
            title={config.title}
            onPlayNow={() => {
              cancelNextEpisode();
              config.onNextEpisode?.();
            }}
            onCancel={cancelNextEpisode}
          />
        )}
      </AnimatePresence>

      {/* 底部控制栏 */}
      <PlayerControls
        containerRef={containerRef}
        artRef={artRef}
        config={config}
        onTogglePlay={togglePlay}
        onToggleFullscreen={toggleFullscreen}
        onSeek={handleSeek}
        onQualityChange={switchQuality}
        onSubtitleChange={switchSubtitle}
        onSpeedChange={handleSpeedChange}
        seekPreview={seekPreview}
        onSeekPreviewChange={setSeekPreview}
      />
    </div>
  );
}

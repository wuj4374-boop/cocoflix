'use client';

import { useRef, useCallback, useState, useEffect, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Subtitles,
  Gauge,
  Monitor,
  PictureInPicture2,
  Clapperboard,
} from 'lucide-react';
import type Artplayer from 'artplayer';

import { usePlayerStore } from '@/stores/playerStore';
import type { PlayerConfig, QualityLevel, SubtitleTrack } from '@/types/player';
import { cn } from '@/lib/utils/cn';

interface PlayerControlsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  artRef: RefObject<Artplayer | null>;
  config: PlayerConfig;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onSeek: (time: number) => void;
  onQualityChange: (quality: QualityLevel) => void;
  onSubtitleChange: (track: SubtitleTrack) => void;
  onSpeedChange: (speed: number) => void;
  seekPreview: { time: number; x: number; visible: boolean };
  onSeekPreviewChange: (preview: { time: number; x: number; visible: boolean }) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function PlayerControls({
  containerRef,
  artRef,
  config,
  onTogglePlay,
  onToggleFullscreen,
  onSeek,
  onQualityChange,
  onSubtitleChange,
  onSpeedChange,
  seekPreview,
  onSeekPreviewChange,
}: PlayerControlsProps) {
  const store = usePlayerStore();
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): number => {
      if (!progressRef.current) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    },
    [],
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const progress = getProgressFromEvent(e);
      setDragProgress(progress);
      onSeek(progress * store.duration);

      const handleMouseMove = (ev: MouseEvent) => {
        const p = getProgressFromEvent(ev);
        setDragProgress(p);
        onSeek(p * store.duration);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [store.duration, getProgressFromEvent, onSeek],
  );

  const handleProgressHover = useCallback(
    (e: React.MouseEvent) => {
      if (!progressRef.current || isDragging) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      onSeekPreviewChange({
        time: progress * store.duration,
        x,
        visible: true,
      });
    },
    [store.duration, isDragging, onSeekPreviewChange],
  );

  const handleProgressLeave = useCallback(() => {
    if (!isDragging) {
      onSeekPreviewChange({ ...seekPreview, visible: false });
    }
  }, [isDragging, seekPreview, onSeekPreviewChange]);

  const toggleMenu = useCallback((menu: string) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const closeMenus = useCallback(() => {
    setActiveMenu(null);
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-player-menu]')) {
        closeMenus();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeMenu, closeMenus]);

  const currentProgress = isDragging ? dragProgress : store.currentTime / (store.duration || 1);
  const bufferedProgress = store.buffered / (store.duration || 1);

  const VolumeIcon =
    store.isMuted || store.volume === 0
      ? VolumeX
      : store.volume < 0.5
        ? Volume1
        : Volume2;

  return (
    <AnimatePresence>
      {store.controlsVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-x-0 bottom-0 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient fade background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

          {/* 进度条 */}
          <div className="px-4 md:px-6">
            <div
              ref={progressRef}
              className="group relative h-6 flex items-center cursor-pointer"
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              {/* 进度条轨道 */}
              <div className="absolute inset-x-0 h-1 group-hover:h-1.5 bg-white/15 rounded-full transition-all duration-200">
                {/* 已缓冲 */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/25 rounded-full transition-all"
                  style={{ width: `${bufferedProgress * 100}%` }}
                />
                {/* 已播放 */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                  style={{ width: `${currentProgress * 100}%`, boxShadow: '0 0 8px rgba(229,9,20,0.6)' }}
                />
              </div>

              {/* 拖拽圆点 */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_12px_rgba(229,9,20,0.5)] transition-all duration-150',
                  isDragging || store.controlsVisible
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-0',
                )}
                style={{ left: `calc(${currentProgress * 100}% - 7px)` }}
              />

              {/* 时间预览 */}
              <AnimatePresence>
                {seekPreview.visible && !isDragging && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute -top-10 bg-black/90 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap pointer-events-none"
                    style={{ left: seekPreview.x, transform: 'translateX(-50%)' }}
                  >
                    {formatTime(seekPreview.time)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 控制栏 */}
          <div className="flex items-center justify-between px-4 md:px-6 pb-3 pt-1">
            {/* 左侧控制 */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* 播放/暂停 */}
              <ControlButton
                onClick={onTogglePlay}
                tooltip={store.state === 'playing' ? '暂停 (空格)' : '播放 (空格)'}
              >
                {store.state === 'playing' ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </ControlButton>

              {/* 上一集 */}
              {config.hasPrevEpisode && (
                <ControlButton
                  onClick={() => config.onPrevEpisode?.()}
                  tooltip="上一集 (B)"
                >
                  <SkipBack className="w-4 h-4" />
                </ControlButton>
              )}

              {/* 下一集 */}
              {config.hasNextEpisode && (
                <ControlButton
                  onClick={() => config.onNextEpisode?.()}
                  tooltip="下一集 (N)"
                >
                  <SkipForward className="w-4 h-4" />
                </ControlButton>
              )}

              {/* 音量 */}
              <div className="flex items-center gap-1.5 group/vol" data-player-menu>
                <ControlButton
                  onClick={() => {
                    store.toggleMute();
                    const art = artRef.current;
                    if (art) art.muted = !art.muted;
                  }}
                  tooltip={store.isMuted ? '取消静音 (M)' : '静音 (M)'}
                >
                  <VolumeIcon className="w-5 h-5" />
                </ControlButton>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={store.isMuted ? 0 : store.volume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      store.setVolume(vol);
                      store.setMuted(false);
                      const art = artRef.current;
                      if (art) {
                        art.volume = vol;
                        art.muted = false;
                      }
                    }}
                    className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>
              </div>

              {/* 时间显示 */}
              <div className="text-white/80 text-xs md:text-sm font-mono tabular-nums">
                <span>{formatTime(store.currentTime)}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-white/50">{formatTime(store.duration)}</span>
              </div>
            </div>

            {/* 右侧控制 */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* 倍速 */}
              <div className="relative" data-player-menu>
                <ControlButton
                  onClick={() => toggleMenu('speed')}
                  active={activeMenu === 'speed'}
                  tooltip="倍速 ([ ])"
                >
                  <Gauge className="w-4 h-4" />
                  {store.playbackRate !== 1 && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      {store.playbackRate}
                    </span>
                  )}
                </ControlButton>
                <AnimatePresence>
                  {activeMenu === 'speed' && (
                    <MenuPanel title="播放速度" onClose={closeMenus}>
                      {SPEEDS.map((speed) => (
                        <MenuOption
                          key={speed}
                          label={`${speed}x`}
                          active={store.playbackRate === speed}
                          onClick={() => {
                            onSpeedChange(speed);
                            closeMenus();
                          }}
                        />
                      ))}
                    </MenuPanel>
                  )}
                </AnimatePresence>
              </div>

              {/* 字幕 */}
              {config.subtitles && config.subtitles.length > 0 && (
                <div className="relative" data-player-menu>
                  <ControlButton
                    onClick={() => toggleMenu('subtitle')}
                    active={activeMenu === 'subtitle'}
                    tooltip="字幕 (S)"
                  >
                    <Subtitles className="w-4 h-4" />
                  </ControlButton>
                  <AnimatePresence>
                    {activeMenu === 'subtitle' && (
                      <MenuPanel title="字幕" onClose={closeMenus}>
                        <MenuOption
                          label="关闭"
                          active={store.currentSubtitle === null}
                          onClick={() => {
                            subtitleRef_clear();
                            closeMenus();
                          }}
                        />
                        {config.subtitles.map((sub) => (
                          <MenuOption
                            key={sub.id}
                            label={sub.label}
                            active={store.currentSubtitle === sub.id}
                            onClick={() => {
                              onSubtitleChange(sub);
                              closeMenus();
                            }}
                          />
                        ))}
                      </MenuPanel>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 画质 */}
              {config.sources.length > 1 && (
                <div className="relative" data-player-menu>
                  <ControlButton
                    onClick={() => toggleMenu('quality')}
                    active={activeMenu === 'quality'}
                    tooltip="画质"
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="hidden md:inline text-[10px] ml-0.5 font-semibold">
                      {store.isAutoQuality ? '自动' : store.currentQuality.toUpperCase()}
                    </span>
                  </ControlButton>
                  <AnimatePresence>
                    {activeMenu === 'quality' && (
                      <MenuPanel title="画质" onClose={closeMenus}>
                        <MenuOption
                          label="自动"
                          active={store.isAutoQuality}
                          onClick={() => {
                            store.setAutoQuality(true);
                            closeMenus();
                          }}
                        />
                        {config.sources.map((q) => (
                          <MenuOption
                            key={q.value}
                            label={`${q.label} (${q.height}p)`}
                            active={
                              !store.isAutoQuality &&
                              store.currentQuality === q.value
                            }
                            onClick={() => {
                              onQualityChange(q);
                              closeMenus();
                            }}
                          />
                        ))}
                      </MenuPanel>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 画中画 */}
              <ControlButton
                onClick={() => {
                  const art = artRef.current;
                  if (art) art.pip = !art.pip;
                }}
                tooltip="画中画 (P)"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </ControlButton>

              {/* 影院模式 */}
              <ControlButton
                onClick={() => store.toggleCinemaMode()}
                active={store.isCinemaMode}
                tooltip="影院模式 (C)"
              >
                <Clapperboard className="w-4 h-4" />
              </ControlButton>

              {/* 全屏 */}
              <ControlButton
                onClick={onToggleFullscreen}
                tooltip={store.isFullscreen ? '退出全屏 (F)' : '全屏 (F)'}
              >
                {store.isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </ControlButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 辅助函数
function subtitleRef_clear() {
  usePlayerStore.getState().setSubtitle(null);
}

// ============ 子组件 ============

function ControlButton({
  children,
  onClick,
  active,
  tooltip,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        'relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90',
        active && 'bg-white/15 text-primary',
      )}
    >
      {children}
    </button>
  );
}

function MenuPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute bottom-full right-0 mb-2 min-w-[180px] bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-white/90 text-sm font-medium">{title}</span>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      <div className="py-1 max-h-[300px] overflow-y-auto">{children}</div>
    </motion.div>
  );
}

function MenuOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2',
        active
          ? 'text-primary bg-primary/10'
          : 'text-white/70 hover:text-white hover:bg-white/5',
      )}
    >
      {active && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
      <span className={active ? '' : 'pl-3.5'}>{label}</span>
    </button>
  );
}

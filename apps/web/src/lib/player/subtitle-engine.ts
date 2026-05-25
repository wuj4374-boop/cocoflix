'use client';

import type { SubtitleTrack } from '@/types/player';

export class SubtitleEngine {
  private container: HTMLElement | null = null;
  private activeTrack: SubtitleTrack | null = null;
  private vttTrack: HTMLTrackElement | null = null;
  private assRenderer: { dispose: () => void } | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(private videoElement: HTMLVideoElement) {}

  init(container: HTMLElement): void {
    this.container = container;
    this.injectSubtitleStyles();
  }

  private injectSubtitleStyles(): void {
    if (typeof document === 'undefined') return;
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      .coco-subtitle-container {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        text-align: center;
        pointer-events: none;
        z-index: 10;
        transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .coco-subtitle-container.controls-visible {
        bottom: 120px;
      }
      .coco-subtitle-text {
        display: inline-block;
        color: #fff;
        font-size: 1.4em;
        font-weight: 500;
        text-shadow:
          0 0 4px rgba(0,0,0,0.9),
          0 0 8px rgba(0,0,0,0.7),
          0 2px 4px rgba(0,0,0,0.8),
          2px 0 4px rgba(0,0,0,0.8),
          -2px 0 4px rgba(0,0,0,0.8),
          0 -2px 4px rgba(0,0,0,0.8);
        padding: 4px 12px;
        border-radius: 4px;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        line-height: 1.5;
        max-width: 80%;
        word-break: break-word;
      }
      .coco-subtitle-text:empty {
        display: none;
      }
      video::cue {
        background: rgba(0,0,0,0.45);
        color: #fff;
        font-size: 1.4em;
        font-weight: 500;
        text-shadow: 0 0 4px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border-radius: 4px;
      }
      .art-subtitle {
        display: none !important;
      }
    `;
    document.head.appendChild(this.styleElement);
  }

  async loadTrack(track: SubtitleTrack): Promise<void> {
    this.clear();

    this.activeTrack = track;

    switch (track.type) {
      case 'vtt':
      case 'srt':
        this.loadVttTrack(track);
        break;
      case 'ass':
        await this.loadAssTrack(track);
        break;
    }
  }

  private loadVttTrack(track: SubtitleTrack): void {
    if (!this.videoElement) return;

    const existingTracks = this.videoElement.querySelectorAll('track');
    existingTracks.forEach((t) => t.remove());

    const trackElement = document.createElement('track');
    trackElement.kind = 'subtitles';
    trackElement.label = track.label;
    trackElement.srclang = track.language;
    trackElement.src = track.url;
    trackElement.default = true;

    this.videoElement.appendChild(trackElement);
    this.vttTrack = trackElement;

    trackElement.addEventListener('load', () => {
      const textTrack = trackElement.track;
      if (textTrack) {
        textTrack.mode = 'showing';
      }
    });
  }

  private async loadAssTrack(track: SubtitleTrack): Promise<void> {
    if (!this.container || !this.videoElement) return;

    try {
      const response = await fetch(track.url);
      const assContent = await response.text();

      const subtitleContainer = document.createElement('div');
      subtitleContainer.className = 'coco-subtitle-container';
      this.container.appendChild(subtitleContainer);

      this.parseAndRenderAss(assContent, subtitleContainer);
    } catch {
      this.loadVttTrack(track);
    }
  }

  private parseAndRenderAss(content: string, container: HTMLElement): void {
    const events = this.parseAssEvents(content);
    let currentIndex = 0;

    const renderSubtitle = () => {
      const currentTime = this.videoElement.currentTime;

      while (
        currentIndex < events.length &&
        events[currentIndex].end <= currentTime
      ) {
        currentIndex++;
      }

      let text = '';
      for (let i = currentIndex; i < events.length; i++) {
        const event = events[i];
        if (event.start <= currentTime && event.end > currentTime) {
          text = event.text;
          break;
        }
        if (event.start > currentTime) break;
      }

      const cleaned = text
        .replace(/\\N/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\{[^}]*\}/g, '')
        .trim();

      container.innerHTML = cleaned
        ? `<span class="coco-subtitle-text">${cleaned.replace(/\n/g, '<br>')}</span>`
        : '';

      if (!this.videoElement.paused) {
        requestAnimationFrame(renderSubtitle);
      }
    };

    this.videoElement.addEventListener('play', () => requestAnimationFrame(renderSubtitle));
    this.videoElement.addEventListener('seeked', () => {
      currentIndex = 0;
      requestAnimationFrame(renderSubtitle);
    });

    if (!this.videoElement.paused) {
      requestAnimationFrame(renderSubtitle);
    }
  }

  private parseAssEvents(content: string): Array<{ start: number; end: number; text: string }> {
    const events: Array<{ start: number; end: number; text: string }> = [];
    const lines = content.split('\n');
    let inEvents = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[Events]') {
        inEvents = true;
        continue;
      }
      if (trimmed.startsWith('[') && trimmed !== '[Events]') {
        inEvents = false;
        continue;
      }

      if (inEvents && trimmed.startsWith('Dialogue:')) {
        const parts = trimmed.substring(10).split(',');
        if (parts.length >= 10) {
          const start = this.parseAssTime(parts[1].trim());
          const end = this.parseAssTime(parts[2].trim());
          const text = parts.slice(9).join(',').trim();
          events.push({ start, end, text });
        }
      }
    }

    return events.sort((a, b) => a.start - b.start);
  }

  private parseAssTime(time: string): number {
    const match = time.match(/(\d+):(\d+):(\d+)\.(\d+)/);
    if (!match) return 0;
    const [, h, m, s, cs] = match;
    return (
      parseInt(h, 10) * 3600 +
      parseInt(m, 10) * 60 +
      parseInt(s, 10) +
      parseInt(cs, 10) / 100
    );
  }

  clear(): void {
    if (this.vttTrack) {
      this.vttTrack.remove();
      this.vttTrack = null;
    }

    if (this.container) {
      const subContainer = this.container.querySelector('.coco-subtitle-container');
      if (subContainer) subContainer.remove();
    }

    if (this.videoElement) {
      const tracks = this.videoElement.querySelectorAll('track');
      tracks.forEach((t) => t.remove());
    }

    this.assRenderer?.dispose();
    this.assRenderer = null;
    this.activeTrack = null;
  }

  setControlsVisible(visible: boolean): void {
    if (!this.container) return;
    const subContainer = this.container.querySelector('.coco-subtitle-container');
    if (subContainer) {
      subContainer.classList.toggle('controls-visible', visible);
    }
  }

  get active(): SubtitleTrack | null {
    return this.activeTrack;
  }

  destroy(): void {
    this.clear();
    this.styleElement?.remove();
    this.styleElement = null;
    this.container = null;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  SearchResult,
  AggregatedResult,
  AggregatedSource,
  AggregatedEpisode,
  VideoQualityInfo,
  VideoQuality,
  VideoCodec,
  AudioCodec,
  HDRType,
} from '../types';
import * as crypto from 'crypto';

interface QualityScore {
  resolution: number;
  codec: number;
  audio: number;
  hdr: number;
  source: number;
  total: number;
}

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);

  aggregate(results: SearchResult[]): AggregatedResult[] {
    if (results.length === 0) return [];

    const { unique } = this.deduplicate(results);
    const groups = this.groupByTitle(unique);

    const aggregated: AggregatedResult[] = [];
    for (const group of groups) {
      const aggResult = this.buildAggregatedResult(group);
      aggregated.push(aggResult);
    }

    aggregated.sort((a, b) => b.score - a.score);

    this.logger.log(
      `Aggregated ${results.length} results into ${aggregated.length} unique entries`,
    );

    return aggregated;
  }

  private deduplicate(results: SearchResult[]): { unique: SearchResult[] } {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const key = this.generateDeduplicationKey(result);
      const existing = seen.get(key);

      if (existing) {
        if (this.compareQuality(result.quality, existing.quality) > 0) {
          seen.set(key, result);
        }
      } else {
        seen.set(key, result);
      }
    }

    return { unique: Array.from(seen.values()) };
  }

  private generateDeduplicationKey(result: SearchResult): string {
    const normalizedTitle = this.normalizeTitle(result.title);
    const year = result.year || '';
    const isSeries = result.isSeries ? 's' : 'm';
    const key = `${normalizedTitle}|${year}|${isSeries}`;
    return crypto.createHash('md5').update(key).digest('hex').substring(0, 16);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[\s　]+/g, ' ')
      .replace(/[：:，,。.！!？?、\-—_·""''「」『』【】\[\]()（）《》<>]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  private groupByTitle(results: SearchResult[]): SearchResult[][] {
    const groups: SearchResult[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      if (assigned.has(results[i].id)) continue;

      const group: SearchResult[] = [results[i]];
      assigned.add(results[i].id);

      for (let j = i + 1; j < results.length; j++) {
        if (assigned.has(results[j].id)) continue;

        if (this.areSameTitle(results[i], results[j])) {
          group.push(results[j]);
          assigned.add(results[j].id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areSameTitle(a: SearchResult, b: SearchResult): boolean {
    const normA = this.normalizeTitle(a.title);
    const normB = this.normalizeTitle(b.title);

    if (normA === normB) return true;

    if (normA.includes(normB) || normB.includes(normA)) {
      if (a.year && b.year && Math.abs(a.year - b.year) > 1) return false;
      return true;
    }

    const distance = this.levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);
    const similarity = 1 - distance / maxLen;

    if (similarity > 0.85) {
      if (a.year && b.year && Math.abs(a.year - b.year) > 1) return false;
      return true;
    }

    return false;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }

    return dp[m][n];
  }

  private buildAggregatedResult(group: SearchResult[]): AggregatedResult {
    const sorted = [...group].sort(
      (a, b) => this.calculateQualityScore(b.quality).total - this.calculateQualityScore(a.quality).total,
    );
    const best = sorted[0];

    const sources: AggregatedSource[] = group.map((item) => ({
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      sourceType: item.sourceType,
      quality: item.quality,
      playUrl: item.playUrl,
      updateTime: item.updateTime,
      reliability: this.calculateReliability(item),
    }));

    sources.sort(
      (a, b) => this.calculateQualityScore(b.quality).total - this.calculateQualityScore(a.quality).total,
    );

    const bestQuality = this.getBestQuality(group.map((g) => g.quality));
    const episodes = best.isSeries ? this.aggregateEpisodes(group) : undefined;
    const score = this.calculateAggregatedScore(group, sources);

    return {
      id: crypto.createHash('md5').update(`${best.title}_${best.year}`).digest('hex').substring(0, 20),
      title: best.title,
      originalTitle: best.originalTitle,
      year: best.year,
      poster: best.poster,
      description: best.description,
      genres: this.mergeGenres(group),
      actors: this.mergeList(group, 'actors'),
      directors: this.mergeList(group, 'directors'),
      rating: this.getBestRating(group),
      isSeries: best.isSeries,
      sources,
      bestQuality,
      totalSources: sources.length,
      episodes,
      score,
    };
  }

  private aggregateEpisodes(group: SearchResult[]): AggregatedEpisode[] {
    const episodeMap = new Map<number, AggregatedEpisode>();

    for (const item of group) {
      if (!item.episodes) continue;

      for (const ep of item.episodes) {
        const existing = episodeMap.get(ep.episodeNumber);

        if (existing) {
          existing.sources.push({
            sourceId: item.sourceId,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            quality: ep.quality || item.quality,
            playUrl: ep.playUrl,
            reliability: this.calculateReliability(item),
          });
        } else {
          episodeMap.set(ep.episodeNumber, {
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            sources: [
              {
                sourceId: item.sourceId,
                sourceName: item.sourceName,
                sourceType: item.sourceType,
                quality: ep.quality || item.quality,
                playUrl: ep.playUrl,
                reliability: this.calculateReliability(item),
              },
            ],
            bestQuality: ep.quality || item.quality,
          });
        }
      }
    }

    const episodes = Array.from(episodeMap.values()).sort(
      (a, b) => a.episodeNumber - b.episodeNumber,
    );

    for (const ep of episodes) {
      ep.bestQuality = this.getBestQuality(ep.sources.map((s) => s.quality));
      ep.sources.sort(
        (a, b) => this.calculateQualityScore(b.quality).total - this.calculateQualityScore(a.quality).total,
      );
    }

    return episodes;
  }

  private getBestQuality(qualities: VideoQualityInfo[]): VideoQualityInfo {
    if (qualities.length === 0) {
      return {
        resolution: VideoQuality.UNKNOWN,
        codec: VideoCodec.UNKNOWN,
        audioCodec: AudioCodec.UNKNOWN,
        hdr: HDRType.NONE,
      };
    }

    return qualities.reduce((best, current) =>
      this.compareQuality(current, best) > 0 ? current : best,
    );
  }

  private compareQuality(a: VideoQualityInfo, b: VideoQualityInfo): number {
    return this.calculateQualityScore(a).total - this.calculateQualityScore(b).total;
  }

  private calculateQualityScore(quality: VideoQualityInfo): QualityScore {
    const resolutionScores: Record<string, number> = {
      [VideoQuality.UHD_4K]: 100,
      [VideoQuality.Q_2K]: 80,
      [VideoQuality.FHD_1080P]: 60,
      [VideoQuality.HD_720P]: 40,
      [VideoQuality.SD_480P]: 20,
      [VideoQuality.UNKNOWN]: 0,
    };

    const codecScores: Record<string, number> = {
      [VideoCodec.AV1]: 100,
      [VideoCodec.HEVC]: 90,
      [VideoCodec.H265]: 90,
      [VideoCodec.VP9]: 80,
      [VideoCodec.H264]: 60,
      [VideoCodec.UNKNOWN]: 30,
    };

    const audioScores: Record<string, number> = {
      [AudioCodec.DOLBY_ATMOS]: 100,
      [AudioCodec.DOLBY_DIGITAL]: 80,
      [AudioCodec.DTS]: 75,
      [AudioCodec.FLAC]: 70,
      [AudioCodec.AAC]: 50,
      [AudioCodec.MP3]: 30,
      [AudioCodec.UNKNOWN]: 20,
    };

    const hdrScores: Record<string, number> = {
      [HDRType.DOLBY_VISION]: 100,
      [HDRType.HDR10_PLUS]: 90,
      [HDRType.HDR10]: 70,
      [HDRType.HLG]: 60,
      [HDRType.NONE]: 0,
    };

    const sourceScores: Record<string, number> = {
      BluRay: 100,
      'WEB-DL': 80,
      WEBRip: 70,
      HDTV: 50,
      DVDRip: 40,
    };

    const resolution = resolutionScores[quality.resolution] || 0;
    const codec = codecScores[quality.codec] || 30;
    const audio = audioScores[quality.audioCodec] || 20;
    const hdr = hdrScores[quality.hdr] || 0;
    const source = quality.source ? (sourceScores[quality.source] || 50) : 50;

    const total = resolution * 0.35 + codec * 0.2 + audio * 0.15 + hdr * 0.15 + source * 0.15;

    return { resolution, codec, audio, hdr, source, total };
  }

  private calculateReliability(item: SearchResult): number {
    const typeScores: Record<string, number> = {
      m3u8: 0.8,
      cloud: 0.6,
      anime: 0.85,
      overseas: 0.75,
    };
    return typeScores[item.sourceType] || 0.5;
  }

  private calculateAggregatedScore(group: SearchResult[], sources: AggregatedSource[]): number {
    let score = 0;

    score += Math.min(sources.length * 10, 50);

    const bestQuality = this.getBestQuality(group.map((g) => g.quality));
    score += this.calculateQualityScore(bestQuality).total * 0.3;

    const rating = this.getBestRating(group);
    if (rating) score += rating * 2;

    if (group.some((g) => g.isSeries)) {
      const maxEpisodes = Math.max(...group.map((g) => g.episodes?.length || 0));
      score += Math.min(maxEpisodes, 20);
    }

    return Math.round(score * 100) / 100;
  }

  private getBestRating(group: SearchResult[]): number | undefined {
    const ratings = group.filter((g) => g.rating).map((g) => g.rating!);
    return ratings.length > 0 ? Math.max(...ratings) : undefined;
  }

  private mergeGenres(group: SearchResult[]): string[] {
    const genres = new Set<string>();
    for (const item of group) {
      item.genres?.forEach((g) => genres.add(g));
    }
    return Array.from(genres);
  }

  private mergeList(group: SearchResult[], key: 'actors' | 'directors'): string[] {
    const items = new Set<string>();
    for (const item of group) {
      (item[key] || []).forEach((i) => items.add(i));
    }
    return Array.from(items);
  }
}

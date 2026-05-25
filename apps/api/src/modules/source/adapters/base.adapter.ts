import {
  AdapterCapabilities,
  AdapterHealth,
  CircuitState,
  SearchQuery,
  SearchResult,
  SourceConfig,
  VideoQuality,
  VideoCodec,
  AudioCodec,
  HDRType,
  VideoQualityInfo,
} from '../types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ISourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly sourceType: string;
  readonly capabilities: AdapterCapabilities;
  readonly config: SourceConfig;

  search(query: SearchQuery): Promise<SearchResult[]>;
  getDetail(id: string): Promise<SearchResult | null>;
  healthCheck(): Promise<AdapterHealth>;
  destroy(): Promise<void>;
}

export abstract class BaseAdapter implements ISourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly sourceType: string;
  readonly config: SourceConfig;
  protected httpClient: AxiosInstance;
  protected health: AdapterHealth = {
    isHealthy: true,
    successRate: 1,
    avgResponseTime: 0,
    lastCheck: Date.now(),
    consecutiveFailures: 0,
    circuitState: CircuitState.CLOSED,
  };
  private responseTimes: number[] = [];

  abstract readonly capabilities: AdapterCapabilities;

  constructor(config: SourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.sourceType = config.type;
    this.config = config;
    this.httpClient = axios.create({
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
  }

  abstract search(query: SearchQuery): Promise<SearchResult[]>;
  abstract getDetail(id: string): Promise<SearchResult | null>;

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const start = Date.now();
      await this.httpClient.get(this.config.baseUrl, { timeout: 5000 });
      const responseTime = Date.now() - start;
      this.recordSuccess(responseTime);
    } catch {
      this.recordFailure();
    }
    return this.getHealth();
  }

  getHealth(): AdapterHealth {
    return { ...this.health };
  }

  protected recordSuccess(responseTime: number): void {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) this.responseTimes.shift();
    this.health.avgResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    this.health.consecutiveFailures = 0;
    this.health.isHealthy = true;
    this.health.lastCheck = Date.now();
    this.health.successRate = this.calculateSuccessRate();
  }

  protected recordFailure(): void {
    this.health.consecutiveFailures++;
    this.health.lastCheck = Date.now();
    if (this.health.consecutiveFailures >= 3) {
      this.health.isHealthy = false;
    }
    this.health.successRate = this.calculateSuccessRate();
  }

  private calculateSuccessRate(): number {
    const total = this.responseTimes.length + this.health.consecutiveFailures;
    if (total === 0) return 1;
    return this.responseTimes.length / total;
  }

  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    const start = Date.now();
    try {
      const response = await this.httpClient.request<T>(config);
      this.recordSuccess(Date.now() - start);
      return response.data;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  protected parseQualityFromTitle(title: string): VideoQualityInfo {
    const upperTitle = title.toUpperCase();

    let resolution = VideoQuality.UNKNOWN;
    if (/4K|2160P|UHD/i.test(upperTitle)) resolution = VideoQuality.UHD_4K;
    else if (/2K|1440P/i.test(upperTitle)) resolution = VideoQuality.Q_2K;
    else if (/1080P|FHD|蓝光/i.test(upperTitle)) resolution = VideoQuality.FHD_1080P;
    else if (/720P|HD/i.test(upperTitle)) resolution = VideoQuality.HD_720P;
    else if (/480P|SD/i.test(upperTitle)) resolution = VideoQuality.SD_480P;

    let codec = VideoCodec.UNKNOWN;
    if (/H\.?265|HEVC|X265/i.test(upperTitle)) codec = VideoCodec.HEVC;
    else if (/H\.?264|X264|AVC/i.test(upperTitle)) codec = VideoCodec.H264;
    else if (/AV1/i.test(upperTitle)) codec = VideoCodec.AV1;
    else if (/VP9/i.test(upperTitle)) codec = VideoCodec.VP9;

    let audioCodec = AudioCodec.UNKNOWN;
    if (/DOLBY.?ATMOS|杜比全景声|ATMOS/i.test(upperTitle)) audioCodec = AudioCodec.DOLBY_ATMOS;
    else if (/DOLBY.?DIGITAL|DD|杜比/i.test(upperTitle)) audioCodec = AudioCodec.DOLBY_DIGITAL;
    else if (/DTS/i.test(upperTitle)) audioCodec = AudioCodec.DTS;
    else if (/AAC/i.test(upperTitle)) audioCodec = AudioCodec.AAC;
    else if (/FLAC/i.test(upperTitle)) audioCodec = AudioCodec.FLAC;

    let hdr = HDRType.NONE;
    if (/HDR10\+/i.test(upperTitle)) hdr = HDRType.HDR10_PLUS;
    else if (/HDR10|HDR/i.test(upperTitle)) hdr = HDRType.HDR10;
    else if (/DOLBY.?VISION|DV/i.test(upperTitle)) hdr = HDRType.DOLBY_VISION;
    else if (/HLG/i.test(upperTitle)) hdr = HDRType.HLG;

    let source: string | undefined;
    if (/BLU.?RAY|蓝光|BDRIP/i.test(upperTitle)) source = 'BluRay';
    else if (/WEB.?DL/i.test(upperTitle)) source = 'WEB-DL';
    else if (/WEB.?RIP/i.test(upperTitle)) source = 'WEBRip';
    else if (/HDTV/i.test(upperTitle)) source = 'HDTV';
    else if (/DVDRIP/i.test(upperTitle)) source = 'DVDRip';

    const fileSizeMatch = title.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
    const fileSize = fileSizeMatch ? `${fileSizeMatch[1]}${fileSizeMatch[2].toUpperCase()}` : undefined;

    return { resolution, codec, audioCodec, hdr, source, fileSize };
  }

  async destroy(): Promise<void> {
    // Cleanup resources
  }
}

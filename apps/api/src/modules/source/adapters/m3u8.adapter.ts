import {
  AdapterCapabilities,
  SearchQuery,
  SearchResult,
  SourceConfig,
  SourceType,
  XmlApiResponse,
  XmlVideoItem,
  EpisodeInfo,
} from '../types';
import { BaseAdapter } from './base.adapter';

export class M3u8Adapter extends BaseAdapter {
  readonly capabilities: AdapterCapabilities = {
    supportsSearch: true,
    supportsDetail: true,
    supportsEpisode: true,
    supportsQualityFilter: false,
    maxConcurrent: 5,
    rateLimit: 2,
    avgResponseTime: 2000,
  };

  constructor(config: SourceConfig) {
    super(config);
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const { keyword, page = 1 } = query;
    const apiUrl = `${this.config.baseUrl}/api.php/provide/vod/?ac=videolist&wd=${encodeURIComponent(keyword)}&pg=${page}`;

    try {
      const data = await this.request<Record<string, unknown>>({
        url: apiUrl,
        method: 'GET',
        responseType: 'json',
      });
      return this.parseVideoList(data);
    } catch {
      try {
        const xmlUrl = `${this.config.baseUrl}/api.php/provide/vod/?ac=videolist&wd=${encodeURIComponent(keyword)}&pg=${page}`;
        const data = await this.request<string>({
          url: xmlUrl,
          method: 'GET',
          responseType: 'text',
        });
        return this.parseXmlResponse(data as string);
      } catch (error) {
        throw error;
      }
    }
  }

  async getDetail(id: string): Promise<SearchResult | null> {
    const apiUrl = `${this.config.baseUrl}/api.php/provide/vod/?ac=detail&ids=${id}`;

    try {
      const data = await this.request<Record<string, unknown>>({
        url: apiUrl,
        method: 'GET',
        responseType: 'json',
      });
      const results = this.parseVideoList(data);
      return results.length > 0 ? results[0] : null;
    } catch {
      return null;
    }
  }

  private parseVideoList(data: Record<string, unknown>): SearchResult[] {
    const list = (data as unknown as XmlApiResponse)?.list;
    if (!list?.video) return [];

    const videos = Array.isArray(list.video) ? list.video : [list.video];
    return videos.map((item) => this.mapVideoToResult(item));
  }

  private mapVideoToResult(item: XmlVideoItem): SearchResult {
    const quality = this.parseQualityFromTitle(item.name + ' ' + (item.remark || ''));
    const episodes = this.parseEpisodes(item);
    const isSeries = episodes.length > 1 || item.type?.includes('连续剧') || item.type?.includes('动漫');

    return {
      id: `${this.id}_${item.id}`,
      sourceId: this.id,
      sourceName: this.name,
      sourceType: SourceType.M3U8,
      title: item.name,
      year: item.year ? parseInt(item.year, 10) : undefined,
      poster: item.pic,
      description: item.des,
      genres: item.type ? item.type.split(/[,，]/) : [],
      actors: item.actor ? item.actor.split(/[,，/]/).map((s: string) => s.trim()) : [],
      directors: item.director ? item.director.split(/[,，/]/).map((s: string) => s.trim()) : [],
      quality,
      playUrl: item.play_url || '',
      episodes,
      isSeries,
      updateTime: item.dt,
      raw: item as unknown as Record<string, unknown>,
    };
  }

  private parseEpisodes(item: XmlVideoItem): EpisodeInfo[] {
    const episodes: EpisodeInfo[] = [];

    if (!item.dl?.dd) return episodes;

    const ddList = Array.isArray(item.dl.dd) ? item.dl.dd : [item.dl.dd];

    for (const dd of ddList) {
      if (!dd._) continue;
      const parts = dd._.split('#');
      for (let i = 0; i < parts.length; i++) {
        const [title, url] = parts[i].split('$');
        if (url) {
          episodes.push({
            episodeNumber: i + 1,
            title: title || `第${i + 1}集`,
            playUrl: url,
          });
        }
      }
    }

    return episodes;
  }

  private parseXmlResponse(xml: string): SearchResult[] {
    const results: SearchResult[] = [];
    const videoRegex = /<video>([\s\S]*?)<\/video>/g;
    let match;

    while ((match = videoRegex.exec(xml)) !== null) {
      const videoXml = match[1];
      const id = this.extractXmlValue(videoXml, 'id');
      const name = this.extractXmlValue(videoXml, 'name');
      const pic = this.extractXmlValue(videoXml, 'pic');
      const dt = this.extractXmlValue(videoXml, 'dt');
      const des = this.extractXmlValue(videoXml, 'des');
      const type = this.extractXmlValue(videoXml, 'type');
      const year = this.extractXmlValue(videoXml, 'year');
      const actor = this.extractXmlValue(videoXml, 'actor');
      const director = this.extractXmlValue(videoXml, 'director');
      const remark = this.extractXmlValue(videoXml, 'remark');

      if (!id || !name) continue;

      const quality = this.parseQualityFromTitle(name + ' ' + (remark || ''));
      const episodes = this.parseXmlEpisodes(videoXml);

      results.push({
        id: `${this.id}_${id}`,
        sourceId: this.id,
        sourceName: this.name,
        sourceType: SourceType.M3U8,
        title: name,
        year: year ? parseInt(year, 10) : undefined,
        poster: pic,
        description: des,
        genres: type ? type.split(/[,，]/) : [],
        actors: actor ? actor.split(/[,，/]/).map((s: string) => s.trim()) : [],
        directors: director ? director.split(/[,，/]/).map((s: string) => s.trim()) : [],
        quality,
        playUrl: '',
        episodes,
        isSeries: episodes.length > 1,
        updateTime: dt,
      });
    }

    return results;
  }

  private extractXmlValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private parseXmlEpisodes(videoXml: string): EpisodeInfo[] {
    const episodes: EpisodeInfo[] = [];
    const ddRegex = /<dd[^>]*flag="([^"]*)"[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dd>/g;
    let ddMatch;

    while ((ddMatch = ddRegex.exec(videoXml)) !== null) {
      const episodeList = ddMatch[2];
      const parts = episodeList.split('#');
      for (let i = 0; i < parts.length; i++) {
        const [title, url] = parts[i].split('$');
        if (url) {
          episodes.push({
            episodeNumber: i + 1,
            title: title || `第${i + 1}集`,
            playUrl: url,
          });
        }
      }
    }

    return episodes;
  }
}

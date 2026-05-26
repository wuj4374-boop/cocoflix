import {
  AdapterCapabilities,
  SearchQuery,
  SearchResult,
  SourceConfig,
  SourceType,
  XmlApiResponse,
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
    // Handle both formats: {list: [...]} and {list: {video: [...]}}
    const listData = (data as unknown as XmlApiResponse)?.list;
    if (!listData) return [];

    let videos: Record<string, unknown>[];
    if (Array.isArray(listData)) {
      videos = listData as Record<string, unknown>[];
    } else if (listData.video) {
      videos = Array.isArray(listData.video) ? listData.video : [listData.video];
    } else {
      return [];
    }

    return videos.map((item) => this.mapVideoToResult(item));
  }

  private mapVideoToResult(item: Record<string, unknown>): SearchResult {
    // Support both old format (name/pic/play_url) and new format (vod_name/vod_pic/vod_play_url)
    const title = (item.name || item.vod_name || '') as string;
    const remark = (item.remark || item.vod_remarks || '') as string;
    const quality = this.parseQualityFromTitle(title + ' ' + remark);
    const episodes = this.parseEpisodesFromItem(item);
    const typeStr = (item.type || item.type_name || item.vod_class || '') as string;
    const isSeries = episodes.length > 1 || typeStr.includes('连续剧') || typeStr.includes('动漫') || typeStr.includes('剧');

    const id = (item.id || item.vod_id || '') as string;
    const year = (item.year || item.vod_year || '') as string;

    return {
      id: `${this.id}_${id}`,
      sourceId: this.id,
      sourceName: this.name,
      sourceType: SourceType.M3U8,
      title,
      year: year ? parseInt(year, 10) : undefined,
      poster: (item.pic || item.vod_pic || '') as string,
      description: (item.des || item.vod_content || item.vod_blurb || '') as string,
      genres: typeStr ? typeStr.split(/[,，/]/) : [],
      actors: this.splitField((item.actor || item.vod_actor || '') as string),
      directors: this.splitField((item.director || item.vod_director || '') as string),
      quality,
      playUrl: (item.play_url || item.vod_play_url || '') as string,
      episodes,
      isSeries,
      updateTime: (item.dt || item.vod_time || '') as string,
      raw: item,
    };
  }

  private splitField(value: string): string[] {
    if (!value) return [];
    return value.split(/[,，/]/).map((s: string) => s.trim()).filter(Boolean);
  }

  private parseEpisodesFromItem(item: Record<string, unknown>): EpisodeInfo[] {
    const episodes: EpisodeInfo[] = [];

    // Try vod_play_url format: "标题$url#标题$url$$$标题$url#标题$url"
    const playUrl = (item.vod_play_url || item.play_url || '') as string;
    if (playUrl) {
      // Multiple play sources separated by $$$
      const sources = playUrl.split('$$$');
      // Use the last source (usually the m3u8 one)
      const lastSource = sources[sources.length - 1] || sources[0];
      const parts = lastSource.split('#');
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
      if (episodes.length > 0) return episodes;
    }

    // Try dl/dd format (XML-style)
    const dl = item.dl as { dd?: Array<{ _?: string; _flag?: string }> } | undefined;
    if (dl?.dd) {
      const ddList = Array.isArray(dl.dd) ? dl.dd : [dl.dd];
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

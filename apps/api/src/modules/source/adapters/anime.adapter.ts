import {
  AdapterCapabilities,
  SearchQuery,
  SearchResult,
  SourceConfig,
  SourceType,
  EpisodeInfo,
  XmlVideoItem,
} from '../types';
import { BaseAdapter } from './base.adapter';

interface AnimeItem {
  id: number | string;
  name: string;
  title?: string;
  cover?: string;
  pic?: string;
  image?: string;
  poster?: string;
  description?: string;
  desc?: string;
  summary?: string;
  year?: string | number;
  season?: number;
  status?: string;
  update_time?: string;
  updateTime?: string;
  tags?: string[];
  genre?: string[];
  type?: string;
  rating?: number | string;
  score?: number;
  play_url?: string;
  playUrl?: string;
  episodes?: Array<{ num: number; url: string; title?: string }>;
  episode_count?: number;
  totalCount?: number;
  bangumiId?: string;
  animeId?: string;
}

export class AnimeAdapter extends BaseAdapter {
  readonly capabilities: AdapterCapabilities = {
    supportsSearch: true,
    supportsDetail: true,
    supportsEpisode: true,
    supportsQualityFilter: true,
    maxConcurrent: 5,
    rateLimit: 3,
    avgResponseTime: 2500,
  };

  constructor(config: SourceConfig) {
    super(config);
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const { keyword, page = 1 } = query;

    const endpoints = [
      `${this.config.baseUrl}/api/bangumi/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      `${this.config.baseUrl}/api/search?q=${encodeURIComponent(keyword)}&page=${page}&type=anime`,
      `${this.config.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      `${this.config.baseUrl}/api.php/provide/vod/?ac=videolist&wd=${encodeURIComponent(keyword)}&pg=${page}`,
    ];

    for (const url of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>({
          url,
          method: 'GET',
          responseType: 'json',
        });
        const results = this.parseAnimeResults(data);
        if (results.length > 0) return results;
      } catch {
        continue;
      }
    }

    try {
      const html = await this.request<string>({
        url: `${this.config.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
        method: 'GET',
        responseType: 'text',
      });
      return this.parseHtmlResults(html);
    } catch {
      return [];
    }
  }

  async getDetail(id: string): Promise<SearchResult | null> {
    const endpoints = [
      `${this.config.baseUrl}/api/bangumi/${id}`,
      `${this.config.baseUrl}/api/anime/${id}`,
      `${this.config.baseUrl}/api.php/provide/vod/?ac=detail&ids=${id}`,
    ];

    for (const url of endpoints) {
      try {
        const data = await this.request<Record<string, unknown>>({
          url,
          method: 'GET',
          responseType: 'json',
        });
        const result = this.parseAnimeDetail(data);
        if (result) return result;
      } catch {
        continue;
      }
    }

    return null;
  }

  private parseAnimeResults(data: Record<string, unknown>): SearchResult[] {
    const list =
      (data.list as Record<string, unknown>[]) ||
      (data.data as Record<string, unknown>[]) ||
      (data.results as Record<string, unknown>[]) ||
      (data.bangumiList as Record<string, unknown>[]) ||
      (data.animes as Record<string, unknown>[]) ||
      [];

    const items = Array.isArray(list) ? list : [];
    const results: SearchResult[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as unknown as AnimeItem;
      const result = this.mapAnimeToResult(item, i);
      if (result) results.push(result);
    }

    if (results.length === 0 && data.list && typeof data.list === 'object') {
      const listData = data.list as { video?: XmlVideoItem[] };
      if (listData.video) {
        const videos = Array.isArray(listData.video) ? listData.video : [listData.video];
        for (let i = 0; i < videos.length; i++) {
          const item = videos[i];
          const quality = this.parseQualityFromTitle(item.name + ' ' + (item.remark || ''));
          results.push({
            id: `${this.id}_anime_${item.id}`,
            sourceId: this.id,
            sourceName: this.name,
            sourceType: SourceType.ANIME,
            title: item.name,
            year: item.year ? parseInt(item.year, 10) : undefined,
            poster: item.pic,
            description: item.des,
            genres: item.type ? item.type.split(/[,，]/) : [],
            quality,
            playUrl: item.play_url || '',
            episodes: this.parseAnimeEpisodes(item),
            isSeries: true,
            updateTime: item.dt,
          });
        }
      }
    }

    return results;
  }

  private mapAnimeToResult(item: AnimeItem, index: number): SearchResult | null {
    const title = item.name || item.title;
    if (!title) return null;

    const quality = this.parseQualityFromTitle(title);
    const episodes = this.buildAnimeEpisodes(item);

    return {
      id: `${this.id}_anime_${item.id || item.bangumiId || item.animeId || index}`,
      sourceId: this.id,
      sourceName: this.name,
      sourceType: SourceType.ANIME,
      title,
      year: item.year ? Number(item.year) : undefined,
      poster: item.cover || item.pic || item.image || item.poster,
      description: item.description || item.desc || item.summary,
      genres: item.tags || item.genre || (item.type ? [item.type] : ['动漫']),
      rating: item.rating || item.score ? Number(item.rating || item.score) : undefined,
      quality,
      playUrl: item.play_url || item.playUrl || '',
      episodes,
      isSeries: true,
      updateTime: item.update_time || item.updateTime,
      raw: item as unknown as Record<string, unknown>,
    };
  }

  private buildAnimeEpisodes(item: AnimeItem): EpisodeInfo[] {
    if (item.episodes && Array.isArray(item.episodes)) {
      return item.episodes.map((ep) => ({
        episodeNumber: ep.num,
        title: ep.title || `第${ep.num}集`,
        playUrl: ep.url,
      }));
    }

    const count = item.episode_count || item.totalCount || 0;
    if (count > 0 && item.play_url) {
      const urls = item.play_url.split('#');
      return urls.map((url: string, i: number) => ({
        episodeNumber: i + 1,
        title: `第${i + 1}集`,
        playUrl: url,
      }));
    }

    return [];
  }

  private parseAnimeEpisodes(item: XmlVideoItem): EpisodeInfo[] {
    if (!item.dl?.dd) return [];
    const episodes: EpisodeInfo[] = [];
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

  private parseAnimeDetail(data: Record<string, unknown>): SearchResult | null {
    const detail = (data.data || data.bangumi || data.anime || data.info || data) as unknown as AnimeItem;
    return this.mapAnimeToResult(detail, 0);
  }

  private parseHtmlResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];
    const itemRegex = /<(?:div|li|article)[^>]*class="[^"]*(?:anime|item|card|bangumi)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi;
    let itemMatch;
    let index = 0;

    while ((itemMatch = itemRegex.exec(html)) !== null && index < 20) {
      const itemHtml = itemMatch[1];
      const titleMatch = itemHtml.match(/(?:title|alt)="([^"]+)"/i) || itemHtml.match(/>([^<]{2,})</);
      const linkMatch = itemHtml.match(/href="([^"]*(?:anime|bangumi|detail)[^"]*)"/i) || itemHtml.match(/href="([^"]+)"/);
      const imgMatch = itemHtml.match(/src="([^"]*(?:cover|poster|pic|image)[^"]*\.(?:jpg|png|webp)[^"]*)"/i);

      if (!titleMatch || !linkMatch) continue;

      const title = titleMatch[1].trim();
      const quality = this.parseQualityFromTitle(title);

      results.push({
        id: `${this.id}_anime_html_${index++}`,
        sourceId: this.id,
        sourceName: this.name,
        sourceType: SourceType.ANIME,
        title,
        poster: imgMatch ? imgMatch[1] : undefined,
        quality,
        playUrl: linkMatch[1],
        isSeries: true,
      });
    }

    return results;
  }
}

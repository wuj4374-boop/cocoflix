import {
  AdapterCapabilities,
  SearchQuery,
  SearchResult,
  SourceConfig,
  SourceType,
} from '../types';
import { BaseAdapter } from './base.adapter';

export class CloudAdapter extends BaseAdapter {
  readonly capabilities: AdapterCapabilities = {
    supportsSearch: true,
    supportsDetail: false,
    supportsEpisode: false,
    supportsQualityFilter: true,
    maxConcurrent: 3,
    rateLimit: 1,
    avgResponseTime: 3000,
  };

  private readonly panPatterns = {
    aliyun: /https?:\/\/(?:www\.)?(?:alipan\.com|aliyundrive\.com)\/s\/[\w]+/g,
    baidu: /https?:\/\/pan\.baidu\.com\/s\/[\w-]+/g,
    quark: /https?:\/\/pan\.quark\.cn\/s\/[\w]+/g,
    xunlei: /https?:\/\/pan\.xunlei\.com\/s\/[\w-]+/g,
    uc: /https?:\/\/drive\.uc\.cn\/s\/[\w]+/g,
    '115': /https?:\/\/115\.com\/s\/[\w]+/g,
  };

  constructor(config: SourceConfig) {
    super(config);
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const { keyword, page = 1 } = query;
    const searchUrl = `${this.config.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;

    try {
      const html = await this.request<string>({
        url: searchUrl,
        method: 'GET',
        responseType: 'text',
      });
      return this.parseSearchResults(html, keyword);
    } catch (error) {
      try {
        const apiUrl = `${this.config.baseUrl}/api/search?q=${encodeURIComponent(keyword)}&page=${page}`;
        const data = await this.request<Record<string, unknown>>({
          url: apiUrl,
          method: 'GET',
          responseType: 'json',
        });
        return this.parseJsonResults(data);
      } catch {
        throw error;
      }
    }
  }

  async getDetail(_id: string): Promise<SearchResult | null> {
    return null;
  }

  private parseSearchResults(html: string, keyword: string): SearchResult[] {
    const results: SearchResult[] = [];
    const itemRegex = /<div[^>]*class="[^"]*(?:item|card|result|resource)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let itemMatch;
    let index = 0;

    while ((itemMatch = itemRegex.exec(html)) !== null && index < 20) {
      const itemHtml = itemMatch[1];
      const title = this.extractText(itemHtml, ['title', 'name']);
      const url = this.extractLink(itemHtml);

      if (!title || !url) continue;

      const quality = this.parseQualityFromTitle(title);
      const panType = this.detectPanType(url);
      const sizeMatch = itemHtml.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);

      results.push({
        id: `${this.id}_cloud_${index++}`,
        sourceId: this.id,
        sourceName: this.name,
        sourceType: SourceType.CLOUD,
        title,
        quality,
        playUrl: url,
        isSeries: false,
        description: sizeMatch ? `文件大小: ${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : undefined,
        raw: { panType, keyword },
      });
    }

    if (results.length === 0) {
      const links = this.extractCloudLinks(html);
      for (const link of links) {
        const quality = this.parseQualityFromTitle(link.title || keyword);
        results.push({
          id: `${this.id}_cloud_${index++}`,
          sourceId: this.id,
          sourceName: this.name,
          sourceType: SourceType.CLOUD,
          title: link.title || keyword,
          quality,
          playUrl: link.url,
          isSeries: false,
          raw: { panType: link.panType },
        });
      }
    }

    return results;
  }

  private parseJsonResults(data: Record<string, unknown>): SearchResult[] {
    const results: SearchResult[] = [];
    const items = (data.data || data.list || data.results || []) as Record<string, unknown>[];

    if (!Array.isArray(items)) return results;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = (item.title || item.name || item.filename || '') as string;
      const url = (item.url || item.link || item.download_url || '') as string;

      if (!title || !url) continue;

      const quality = this.parseQualityFromTitle(title);

      results.push({
        id: `${this.id}_cloud_${i}`,
        sourceId: this.id,
        sourceName: this.name,
        sourceType: SourceType.CLOUD,
        title,
        quality,
        playUrl: url,
        isSeries: false,
        description: item.description as string | undefined,
        raw: item,
      });
    }

    return results;
  }

  private extractText(html: string, classNames: string[]): string {
    for (const cls of classNames) {
      const regex = new RegExp(`<(?:h[1-6]|a|span|p|div)[^>]*class="[^"]*${cls}[^"]*"[^>]*>([^<]+)`, 'i');
      const match = html.match(regex);
      if (match) return match[1].trim();
    }
    const textMatch = html.match(/>([^<]{2,})</);
    return textMatch ? textMatch[1].trim() : '';
  }

  private extractLink(html: string): string {
    const linkMatch = html.match(/href="([^"]*(?:pan|drive|cloud|115|quark)[^"]*)"/i);
    if (linkMatch) return linkMatch[1];
    const anyLink = html.match(/href="(https?:\/\/[^"]+)"/);
    return anyLink ? anyLink[1] : '';
  }

  private extractCloudLinks(html: string): Array<{ url: string; title: string; panType: string }> {
    const links: Array<{ url: string; title: string; panType: string }> = [];

    for (const [panType, pattern] of Object.entries(this.panPatterns)) {
      const regex = new RegExp(pattern.source, 'g');
      let match;
      while ((match = regex.exec(html)) !== null) {
        const start = Math.max(0, match.index - 200);
        const context = html.substring(start, match.index);
        const titleMatch = context.match(/title="([^"]+)"/i) || context.match(/>([^<]{3,})<\//);
        links.push({
          url: match[0],
          title: titleMatch ? titleMatch[1].trim() : '',
          panType,
        });
      }
    }

    return links;
  }

  private detectPanType(url: string): string {
    if (/alipan\.com|aliyundrive\.com/i.test(url)) return 'aliyun';
    if (/pan\.baidu/i.test(url)) return 'baidu';
    if (/pan\.quark/i.test(url)) return 'quark';
    if (/pan\.xunlei/i.test(url)) return 'xunlei';
    if (/drive\.uc/i.test(url)) return 'uc';
    if (/115\.com/i.test(url)) return '115';
    return 'unknown';
  }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SearchCache } from '../entities/search-cache.entity';
import { SearchResult, AggregatedResult } from '../types';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly SEARCH_TTL = 1800; // 30 minutes
  private readonly MAX_MEMORY_ITEMS = 5000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(SearchCache)
    private readonly cacheRepository: Repository<SearchCache>,
  ) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private buildSearchKey(keyword: string, sourceId?: string): string {
    return `search:${sourceId || 'all'}:${keyword.toLowerCase().trim()}`;
  }

  private buildAggKey(keyword: string): string {
    return `agg:${keyword.toLowerCase().trim()}`;
  }

  async getCachedSearch(keyword: string, sourceId?: string): Promise<SearchResult[] | null> {
    const key = this.buildSearchKey(keyword, sourceId);
    return this.get<SearchResult[]>(key);
  }

  async setCachedSearch(keyword: string, results: SearchResult[], sourceId?: string): Promise<void> {
    const key = this.buildSearchKey(keyword, sourceId);
    await this.set(key, results, this.SEARCH_TTL);
  }

  async getCachedAggregated(keyword: string): Promise<AggregatedResult[] | null> {
    const key = this.buildAggKey(keyword);
    return this.get<AggregatedResult[]>(key);
  }

  async setCachedAggregated(keyword: string, results: AggregatedResult[]): Promise<void> {
    const key = this.buildAggKey(keyword);
    await this.set(key, results, this.SEARCH_TTL);
  }

  private async get<T>(key: string): Promise<T | null> {
    // Check memory cache first (fastest)
    const memEntry = this.memoryCache.get(key);
    if (memEntry && Date.now() < memEntry.expiresAt) {
      return memEntry.data as T;
    }
    if (memEntry) {
      this.memoryCache.delete(key);
    }

    // Check SQLite
    try {
      const entry = await this.cacheRepository.findOne({ where: { cacheKey: key } });
      if (entry && new Date() < entry.expiresAt) {
        // Backfill memory cache
        this.memoryCache.set(key, {
          data: entry.data,
          expiresAt: entry.expiresAt.getTime(),
        });
        return entry.data as T;
      }
      if (entry) {
        await this.cacheRepository.remove(entry);
      }
    } catch (error) {
      this.logger.warn(`SQLite cache get error: ${error}`);
    }

    return null;
  }

  private async set<T>(key: string, data: T, ttl: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Set in memory cache
    if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
      this.evictOldest();
    }
    this.memoryCache.set(key, { data, expiresAt: expiresAt.getTime() });

    // Set in SQLite
    try {
      let entry = await this.cacheRepository.findOne({ where: { cacheKey: key } });
      if (entry) {
        entry.data = data;
        entry.expiresAt = expiresAt;
      } else {
        entry = this.cacheRepository.create({ cacheKey: key, data, expiresAt });
      }
      await this.cacheRepository.save(entry);
    } catch (error) {
      this.logger.warn(`SQLite cache set error: ${error}`);
    }
  }

  async invalidate(keyword: string): Promise<void> {
    const pattern = keyword.toLowerCase().trim();

    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear SQLite cache
    try {
      const entries = await this.cacheRepository
        .createQueryBuilder()
        .where('cache_key LIKE :pattern', { pattern: `%${pattern}%` })
        .getMany();
      if (entries.length > 0) {
        await this.cacheRepository.remove(entries);
      }
    } catch (error) {
      this.logger.warn(`SQLite cache invalidate error: ${error}`);
    }
  }

  async invalidateAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      await this.cacheRepository.clear();
    } catch (error) {
      this.logger.warn(`SQLite cache clear error: ${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();

    // Cleanup memory cache
    let memRemoved = 0;
    for (const [key, entry] of this.memoryCache) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
        memRemoved++;
      }
    }

    // Cleanup SQLite cache
    try {
      const result = await this.cacheRepository.delete({
        expiresAt: LessThan(new Date()),
      });
      const dbRemoved = result.affected || 0;
      if (memRemoved > 0 || dbRemoved > 0) {
        this.logger.debug(`Cleaned up ${memRemoved} memory + ${dbRemoved} DB expired cache entries`);
      }
    } catch (error) {
      this.logger.warn(`SQLite cache cleanup error: ${error}`);
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  getStats(): { memoryItems: number; memorySize: number } {
    let memorySize = 0;
    for (const entry of this.memoryCache.values()) {
      memorySize += JSON.stringify(entry.data).length;
    }
    return {
      memoryItems: this.memoryCache.size,
      memorySize,
    };
  }
}

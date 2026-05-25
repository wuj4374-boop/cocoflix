import { Injectable, Logger } from '@nestjs/common';
import { SearchQuery, SearchResult, SearchStats } from '../types';
import { SourceManager } from './source-manager.service';
import { CacheService } from './cache.service';

interface SearchOptions {
  timeout?: number;
  maxConcurrency?: number;
  retryCount?: number;
  retryDelay?: number;
  failFast?: boolean;
  sources?: string[];
}

const DEFAULT_OPTIONS: SearchOptions = {
  timeout: 8000,
  maxConcurrency: 10,
  retryCount: 2,
  retryDelay: 500,
  failFast: false,
};

@Injectable()
export class SearchOrchestrator {
  private readonly logger = new Logger(SearchOrchestrator.name);

  constructor(
    private readonly sourceManager: SourceManager,
    private readonly cacheService: CacheService,
  ) {}

  async search(query: SearchQuery, options?: SearchOptions): Promise<{
    results: SearchResult[];
    stats: SearchStats;
  }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // Check cache first
    const cached = await this.cacheService.getCachedSearch(query.keyword);
    if (cached) {
      this.logger.log(`Cache hit for search: ${query.keyword}`);
      return {
        results: cached,
        stats: {
          totalSources: 0,
          successSources: 0,
          failedSources: 0,
          timeoutSources: 0,
          totalTime: Date.now() - startTime,
          cachedSources: 1,
        },
      };
    }

    // Determine which sources to search
    const sources = opts.sources
      ? opts.sources
          .map((id) => this.sourceManager.getSource(id))
          .filter((s): s is NonNullable<typeof s> => s !== undefined && s.config.enabled)
      : this.sourceManager.getSearchCapableSources();

    if (sources.length === 0) {
      return {
        results: [],
        stats: {
          totalSources: 0,
          successSources: 0,
          failedSources: 0,
          timeoutSources: 0,
          totalTime: Date.now() - startTime,
          cachedSources: 0,
        },
      };
    }

    // Execute searches with concurrency control
    const results = await this.executeConcurrentSearch(sources.map((s) => s.config.id), query, opts);

    // Cache results
    if (results.allResults.length > 0) {
      await this.cacheService.setCachedSearch(query.keyword, results.allResults);
    }

    const stats: SearchStats = {
      totalSources: sources.length,
      successSources: results.successCount,
      failedSources: results.failCount,
      timeoutSources: results.timeoutCount,
      totalTime: Date.now() - startTime,
      cachedSources: 0,
    };

    this.logger.log(
      `Search completed: "${query.keyword}" - ${results.allResults.length} results from ${results.successCount}/${sources.length} sources in ${stats.totalTime}ms`,
    );

    return { results: results.allResults, stats };
  }

  private async executeConcurrentSearch(
    sourceIds: string[],
    query: SearchQuery,
    opts: SearchOptions,
  ): Promise<{
    allResults: SearchResult[];
    successCount: number;
    failCount: number;
    timeoutCount: number;
  }> {
    const allResults: SearchResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let timeoutCount = 0;

    const batches = this.createBatches(sourceIds, opts.maxConcurrency!);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((sourceId) => this.searchWithRetry(sourceId, query, opts)),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.timedOut) {
            timeoutCount++;
          } else if (result.value.results.length > 0) {
            successCount++;
            allResults.push(...result.value.results);
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      if (opts.failFast && allResults.length > 0) {
        break;
      }
    }

    return { allResults, successCount, failCount, timeoutCount };
  }

  private async searchWithRetry(
    sourceId: string,
    query: SearchQuery,
    opts: SearchOptions,
  ): Promise<{ results: SearchResult[]; timedOut: boolean }> {
    const maxAttempts = (opts.retryCount || 0) + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const results = await this.searchWithTimeout(sourceId, query, opts.timeout!);
        return { results, timedOut: false };
      } catch (error) {
        if (this.isTimeoutError(error)) {
          this.logger.warn(`Source ${sourceId} timed out (attempt ${attempt}/${maxAttempts})`);
          if (attempt === maxAttempts) {
            return { results: [], timedOut: true };
          }
        } else {
          this.logger.warn(
            `Source ${sourceId} search failed (attempt ${attempt}/${maxAttempts}): ${(error as Error).message}`,
          );
        }

        if (attempt < maxAttempts && opts.retryDelay) {
          await this.delay(opts.retryDelay * attempt);
        }
      }
    }

    return { results: [], timedOut: false };
  }

  private searchWithTimeout(
    sourceId: string,
    query: SearchQuery,
    timeout: number,
  ): Promise<SearchResult[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Search timeout after ${timeout}ms`));
      }, timeout);

      this.sourceManager
        .executeSearch(sourceId, query)
        .then((results) => {
          clearTimeout(timer);
          resolve(results);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNABORTED')
      );
    }
    return false;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async searchSingleSource(sourceId: string, query: SearchQuery): Promise<SearchResult[]> {
    try {
      return await this.sourceManager.executeSearch(sourceId, query);
    } catch (error) {
      this.logger.error(`Single source search failed for ${sourceId}: ${error}`);
      return [];
    }
  }
}

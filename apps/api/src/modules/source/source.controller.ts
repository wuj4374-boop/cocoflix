import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchOrchestrator } from './services/search-orchestrator.service';
import { SourceManager } from './services/source-manager.service';
import { AggregatorService } from './services/aggregator.service';
import { CacheService } from './services/cache.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { SearchQueryDto, RegisterSourceDto, CircuitResetDto } from './dto/search.dto';
import { AggregatedResult, SearchResult } from './types';

@ApiTags('资源聚合')
@Controller('source')
export class SourceController {
  private readonly logger = new Logger(SourceController.name);

  constructor(
    private readonly searchOrchestrator: SearchOrchestrator,
    private readonly sourceManager: SourceManager,
    private readonly aggregator: AggregatorService,
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  // ==================== Search Endpoints ====================

  @Get('search')
  @ApiOperation({ summary: '聚合搜索', description: '搜索所有资源站并聚合去重返回结果' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'type', required: false, enum: ['m3u8', 'cloud', 'anime', 'overseas', 'custom'] })
  @ApiQuery({ name: 'quality', required: false, enum: ['4K', '2K', '1080P', '720P', '480P', 'unknown'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async search(@Query() queryDto: SearchQueryDto): Promise<{
    results: AggregatedResult[];
    stats: { totalTime: number; totalSources: number; successSources: number };
    query: string;
  }> {
    if (!queryDto.q?.trim()) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    const keyword = queryDto.q.trim();
    this.logger.log(`Search request: "${keyword}"`);

    // Check aggregated cache first
    const cachedAgg = await this.cacheService.getCachedAggregated(keyword);
    if (cachedAgg) {
      return {
        results: cachedAgg,
        stats: { totalTime: 0, totalSources: 0, successSources: 0 },
        query: keyword,
      };
    }

    // Execute search across all sources
    const { results: rawResults, stats } = await this.searchOrchestrator.search(
      {
        keyword,
        type: queryDto.type,
        quality: queryDto.quality,
        isSeries: queryDto.isSeries,
        page: queryDto.page,
        pageSize: queryDto.pageSize,
      },
      {
        timeout: queryDto.timeout,
        maxConcurrency: queryDto.maxConcurrency,
        sources: queryDto.sources,
      },
    );

    // Aggregate results
    let aggregated = this.aggregator.aggregate(rawResults);

    // Apply filters
    if (queryDto.quality) {
      aggregated = aggregated.filter((r) => r.bestQuality.resolution === queryDto.quality);
    }
    if (queryDto.isSeries !== undefined) {
      aggregated = aggregated.filter((r) => r.isSeries === queryDto.isSeries);
    }

    // Apply pagination
    const page = queryDto.page || 1;
    const pageSize = queryDto.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginated = aggregated.slice(start, start + pageSize);

    // Cache aggregated results
    await this.cacheService.setCachedAggregated(keyword, paginated);

    return {
      results: paginated,
      stats: {
        totalTime: stats.totalTime,
        totalSources: stats.totalSources,
        successSources: stats.successSources,
      },
      query: keyword,
    };
  }

  @Post('search/source/:sourceId')
  @ApiOperation({ summary: '搜索单个源' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchSource(
    @Param('sourceId') sourceId: string,
    @Body() body: { keyword: string; page?: number },
  ): Promise<{ results: SearchResult[]; sourceId: string }> {
    if (!body.keyword?.trim()) {
      throw new HttpException('keyword is required', HttpStatus.BAD_REQUEST);
    }

    const results = await this.searchOrchestrator.searchSingleSource(sourceId, {
      keyword: body.keyword.trim(),
      page: body.page,
    });

    return { results, sourceId };
  }

  // ==================== Source Management ====================

  @Get('sources')
  @ApiOperation({ summary: '获取所有资源源列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getSources(): {
    sources: Array<{
      id: string;
      name: string;
      type: string;
      enabled: boolean;
      health: { isHealthy: boolean; successRate: number; avgResponseTime: number };
      circuitState: string;
    }>;
    stats: { total: number; enabled: number; healthy: number };
  } {
    const sources = this.sourceManager.getAllSources();
    const stats = this.sourceManager.getStats();

    return {
      sources: sources.map((s) => ({
        id: s.config.id,
        name: s.config.name,
        type: s.config.type,
        enabled: s.config.enabled,
        health: {
          isHealthy: s.health.isHealthy,
          successRate: s.health.successRate,
          avgResponseTime: s.health.avgResponseTime,
        },
        circuitState: this.circuitBreaker.getState(s.config.id),
      })),
      stats: {
        total: stats.total,
        enabled: stats.enabled,
        healthy: stats.healthy,
      },
    };
  }

  @Post('sources')
  @ApiOperation({ summary: '注册新资源源' })
  @ApiResponse({ status: 201, description: '注册成功' })
  registerSource(@Body() dto: RegisterSourceDto): { success: boolean; message: string } {
    try {
      this.sourceManager.registerSource({
        id: dto.id,
        name: dto.name,
        type: dto.type,
        baseUrl: dto.baseUrl,
        enabled: dto.enabled ?? true,
        priority: dto.priority || 10,
        timeout: dto.timeout || 10000,
        retryCount: dto.retryCount || 3,
        config: dto.config || {},
      });
      return { success: true, message: `Source ${dto.name} registered successfully` };
    } catch (error) {
      throw new HttpException(
        `Failed to register source: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('sources/:sourceId')
  @ApiOperation({ summary: '注销资源源' })
  @ApiResponse({ status: 200, description: '注销成功' })
  unregisterSource(@Param('sourceId') sourceId: string): { success: boolean; message: string } {
    this.sourceManager.unregisterSource(sourceId);
    return { success: true, message: `Source ${sourceId} unregistered` };
  }

  @Post('sources/:sourceId/enable')
  @ApiOperation({ summary: '启用资源源' })
  @ApiResponse({ status: 200, description: '启用成功' })
  enableSource(@Param('sourceId') sourceId: string): { success: boolean } {
    this.sourceManager.enableSource(sourceId);
    return { success: true };
  }

  @Post('sources/:sourceId/disable')
  @ApiOperation({ summary: '禁用资源源' })
  @ApiResponse({ status: 200, description: '禁用成功' })
  disableSource(@Param('sourceId') sourceId: string): { success: boolean } {
    this.sourceManager.disableSource(sourceId);
    return { success: true };
  }

  @Get('sources/:sourceId/health')
  @ApiOperation({ summary: '检查单个源健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkSourceHealth(@Param('sourceId') sourceId: string) {
    try {
      const health = await this.sourceManager.checkHealth(sourceId);
      return { sourceId, health };
    } catch {
      throw new HttpException(`Source not found: ${sourceId}`, HttpStatus.NOT_FOUND);
    }
  }

  @Get('sources/health/all')
  @ApiOperation({ summary: '检查所有源健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkAllHealth() {
    const healthMap = await this.sourceManager.checkAllHealth();
    const result: Record<string, unknown> = {};
    for (const [id, health] of healthMap) {
      result[id] = health;
    }
    return result;
  }

  // ==================== Circuit Breaker ====================

  @Get('circuit-breaker')
  @ApiOperation({ summary: '获取熔断器状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCircuitBreakerStates() {
    return this.circuitBreaker.getStats();
  }

  @Post('circuit-breaker/reset')
  @ApiOperation({ summary: '重置指定源熔断器' })
  @ApiResponse({ status: 200, description: '重置成功' })
  resetCircuitBreaker(@Body() dto: CircuitResetDto) {
    this.circuitBreaker.reset(dto.sourceId);
    return { success: true, message: `Circuit breaker reset for ${dto.sourceId}` };
  }

  @Post('circuit-breaker/reset-all')
  @ApiOperation({ summary: '重置所有熔断器' })
  @ApiResponse({ status: 200, description: '重置成功' })
  resetAllCircuitBreakers() {
    this.circuitBreaker.resetAll();
    return { success: true, message: 'All circuit breakers reset' };
  }

  // ==================== Cache Management ====================

  @Delete('cache')
  @ApiOperation({ summary: '清除所有缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  async clearCache() {
    await this.cacheService.invalidateAll();
    return { success: true, message: 'Cache cleared' };
  }

  @Delete('cache/:keyword')
  @ApiOperation({ summary: '清除指定关键词缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  async clearCacheKeyword(@Param('keyword') keyword: string) {
    await this.cacheService.invalidate(keyword);
    return { success: true, message: `Cache cleared for "${keyword}"` };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: '获取缓存统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCacheStats() {
    return this.cacheService.getStats();
  }

  // ==================== System Stats ====================

  @Get('stats')
  @ApiOperation({ summary: '获取系统统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats() {
    return {
      sources: this.sourceManager.getStats(),
      cache: this.cacheService.getStats(),
      circuitBreaker: this.circuitBreaker.getStats(),
    };
  }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdapterHealth,
  AdapterCapabilities,
  CircuitState,
  SearchQuery,
  SearchResult,
  SourceConfig,
  SourceType,
} from '../types';
import { BaseAdapter, createAdapter } from '../adapters';
import { CircuitBreakerService } from './circuit-breaker.service';
import { Source } from '../entities/source.entity';

interface ManagedSource {
  adapter: BaseAdapter;
  config: SourceConfig;
  health: AdapterHealth;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

@Injectable()
export class SourceManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SourceManager.name);
  private readonly sources = new Map<string, ManagedSource>();

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Load sources from database and register them
    await this.loadSourcesFromDb();
    this.logger.log(`SourceManager initialized with ${this.sources.size} sources`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const [id, source] of this.sources) {
      try {
        await source.adapter.destroy();
      } catch (error) {
        this.logger.error(`Error destroying source ${id}: ${error}`);
      }
    }
  }

  async loadSourcesFromDb(): Promise<void> {
    try {
      const dbSources = await this.sourceRepository.find({ where: { enabled: true } });
      for (const dbSource of dbSources) {
        const config: SourceConfig = {
          id: dbSource.id,
          name: dbSource.name,
          type: dbSource.type as SourceType,
          baseUrl: dbSource.url || '',
          enabled: dbSource.enabled,
          priority: dbSource.priority,
          timeout: dbSource.timeout,
          retryCount: dbSource.retryCount,
          config: dbSource.config || {},
        };
        this.registerSource(config);
      }
    } catch (error) {
      this.logger.error(`Failed to load sources from DB: ${error}`);
    }
  }

  registerSource(config: SourceConfig): void {
    if (this.sources.has(config.id)) {
      this.logger.warn(`Source ${config.id} already registered, updating...`);
      this.unregisterSource(config.id);
    }

    try {
      const adapter = createAdapter(config);
      const health: AdapterHealth = {
        isHealthy: true,
        successRate: 1,
        avgResponseTime: 0,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        circuitState: CircuitState.CLOSED,
      };

      this.sources.set(config.id, {
        adapter,
        config,
        health,
        lastUsed: 0,
        requestCount: 0,
        errorCount: 0,
      });

      this.circuitBreaker.configure(config.id, {
        failureThreshold: config.retryCount || 5,
        timeout: 60000,
      });

      this.logger.log(`Source registered: ${config.name} (${config.type}) [${config.id}]`);
    } catch (error) {
      this.logger.error(`Failed to register source ${config.id}: ${error}`);
    }
  }

  unregisterSource(id: string): void {
    const source = this.sources.get(id);
    if (source) {
      source.adapter.destroy().catch(() => {});
      this.sources.delete(id);
      this.circuitBreaker.reset(id);
      this.logger.log(`Source unregistered: ${id}`);
    }
  }

  getSource(id: string): ManagedSource | undefined {
    return this.sources.get(id);
  }

  getAdapter(id: string): BaseAdapter | undefined {
    return this.sources.get(id)?.adapter;
  }

  getAllSources(): ManagedSource[] {
    return Array.from(this.sources.values());
  }

  getEnabledSources(): ManagedSource[] {
    return Array.from(this.sources.values()).filter((s) => s.config.enabled);
  }

  getHealthySources(): ManagedSource[] {
    return Array.from(this.sources.values()).filter((s) => {
      if (!s.config.enabled) return false;
      return this.circuitBreaker.canExecute(s.config.id);
    });
  }

  getSearchCapableSources(): ManagedSource[] {
    return this.getHealthySources().filter(
      (s) => s.adapter.capabilities.supportsSearch,
    );
  }

  async executeSearch(sourceId: string, query: SearchQuery): Promise<SearchResult[]> {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    if (!this.circuitBreaker.canExecute(sourceId)) {
      this.logger.warn(`Circuit breaker open for ${sourceId}, skipping search`);
      return [];
    }

    source.lastUsed = Date.now();
    source.requestCount++;

    try {
      const results = await source.adapter.search(query);
      this.circuitBreaker.recordSuccess(sourceId);
      source.health = source.adapter.getHealth();
      return results;
    } catch (error) {
      this.circuitBreaker.recordFailure(sourceId);
      source.errorCount++;
      source.health = source.adapter.getHealth();
      throw error;
    }
  }

  async checkHealth(sourceId: string): Promise<AdapterHealth> {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const health = await source.adapter.healthCheck();
    source.health = health;
    return health;
  }

  async checkAllHealth(): Promise<Map<string, AdapterHealth>> {
    const results = new Map<string, AdapterHealth>();

    const promises = Array.from(this.sources.entries()).map(async ([id, source]) => {
      try {
        const health = await source.adapter.healthCheck();
        source.health = health;
        results.set(id, health);
      } catch {
        results.set(id, {
          isHealthy: false,
          successRate: 0,
          avgResponseTime: 0,
          lastCheck: Date.now(),
          consecutiveFailures: -1,
          circuitState: this.circuitBreaker.getState(id),
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  getStats(): {
    total: number;
    enabled: number;
    healthy: number;
    byType: Record<string, number>;
    circuitStates: Record<string, CircuitState>;
  } {
    const byType: Record<string, number> = {};
    const circuitStates: Record<string, CircuitState> = {};
    let healthy = 0;

    for (const [id, source] of this.sources) {
      const type = source.config.type;
      byType[type] = (byType[type] || 0) + 1;
      circuitStates[id] = this.circuitBreaker.getState(id);
      if (source.config.enabled && this.circuitBreaker.canExecute(id)) {
        healthy++;
      }
    }

    return {
      total: this.sources.size,
      enabled: this.getEnabledSources().length,
      healthy,
      byType,
      circuitStates,
    };
  }

  async enableSource(id: string): Promise<void> {
    const source = this.sources.get(id);
    if (source) {
      source.config.enabled = true;
      this.circuitBreaker.reset(id);
      await this.sourceRepository.update(id, { enabled: true });
    }
  }

  async disableSource(id: string): Promise<void> {
    const source = this.sources.get(id);
    if (source) {
      source.config.enabled = false;
      await this.sourceRepository.update(id, { enabled: false });
    }
  }

  getCapabilities(sourceId: string): AdapterCapabilities | null {
    return this.sources.get(sourceId)?.adapter.capabilities || null;
  }
}

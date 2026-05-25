import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SourceController } from './source.controller';
import { Source } from './entities/source.entity';
import { SearchCache } from './entities/search-cache.entity';

import { AggregatorService } from './services/aggregator.service';
import { CacheService } from './services/cache.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { SourceManager } from './services/source-manager.service';
import { SearchOrchestrator } from './services/search-orchestrator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Source, SearchCache])],
  controllers: [SourceController],
  providers: [
    CircuitBreakerService,
    CacheService,
    AggregatorService,
    SourceManager,
    SearchOrchestrator,
  ],
  exports: [SearchOrchestrator, SourceManager, AggregatorService],
})
export class SourceModule {}

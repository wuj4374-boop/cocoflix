import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MetadataScraperService } from './metadata-scraper.service';
import { ImageProxyService } from './image-proxy.service';
import { Media } from '../../media/entities/media.entity';

@Injectable()
export class MetadataScheduleService {
  private readonly logger = new Logger(MetadataScheduleService.name);

  constructor(
    private readonly scraperService: MetadataScraperService,
    private readonly imageProxyService: ImageProxyService,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  // 每天凌晨3点执行新内容刮削
  @Cron('0 3 * * *', { name: 'scrape-new-media' })
  async handleScrapeNewMedia(): Promise<void> {
    this.logger.log('开始定时刮削新内容元数据...');
    try {
      const results = await this.scraperService.scrapeAll(100);
      const success = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      this.logger.log(`定时刮削完成: 成功 ${success}, 失败 ${failed}, 总计 ${results.length}`);
    } catch (error) {
      this.logger.error(`定时刮削失败: ${(error as Error).message}`);
    }
  }

  // 每天凌晨4点更新已有内容元数据
  @Cron('0 4 * * *', { name: 'update-existing-metadata' })
  async handleUpdateExistingMetadata(): Promise<void> {
    this.logger.log('开始定时更新已有元数据...');
    try {
      // 找出超过7天未更新的媒体
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const staleMedia = await this.mediaRepository
        .createQueryBuilder('media')
        .where('media.tmdb_id IS NOT NULL AND media.tmdb_id > 0')
        .andWhere(
          "(json_extract(media.metadata, '$.lastScrapedAt') IS NULL OR json_extract(media.metadata, '$.lastScrapedAt') < :sevenDaysAgo)",
          { sevenDaysAgo },
        )
        .orderBy('media.updated_at', 'ASC')
        .limit(50)
        .getMany();

      let success = 0;
      let failed = 0;

      for (const media of staleMedia) {
        try {
          const result = await this.scraperService.scrapeMedia(media.id);
          if (result.success) {
            success++;
          } else {
            failed++;
          }
          // 限制请求频率
          await delay(250);
        } catch {
          failed++;
        }
      }

      this.logger.log(`元数据更新完成: 成功 ${success}, 失败 ${failed}, 总计 ${staleMedia.length}`);
    } catch (error) {
      this.logger.error(`元数据更新失败: ${(error as Error).message}`);
    }
  }

  // 每周日凌晨5点清理过期图片缓存
  @Cron(CronExpression.EVERY_WEEK, { name: 'clean-image-cache' })
  async handleCleanImageCache(): Promise<void> {
    this.logger.log('开始清理图片缓存...');
    try {
      const cacheSize = await this.imageProxyService.getCacheSize();
      this.logger.log(
        `当前缓存大小: ${(cacheSize.total / 1024 / 1024).toFixed(2)} MB`,
      );

      // 如果缓存超过5GB，清理最旧的缓存
      const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
      if (cacheSize.total > maxSize) {
        const cleared = await this.imageProxyService.clearCache();
        this.logger.log(`已清理 ${cleared} 个缓存图片`);
      }
    } catch (error) {
      this.logger.error(`清理图片缓存失败: ${(error as Error).message}`);
    }
  }

  // 获取定时任务状态
  getStatus(): Record<string, unknown> {
    return {
      tasks: [
        {
          name: 'scrape-new-media',
          description: '刮削新内容元数据',
          schedule: '每天 03:00',
          nextRun: '下次执行时间由调度器管理',
        },
        {
          name: 'update-existing-metadata',
          description: '更新已有元数据',
          schedule: '每天 04:00',
          nextRun: '下次执行时间由调度器管理',
        },
        {
          name: 'clean-image-cache',
          description: '清理过期图片缓存',
          schedule: '每周日 05:00',
          nextRun: '下次执行时间由调度器管理',
        },
      ],
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

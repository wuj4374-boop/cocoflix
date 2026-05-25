import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  Res,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { MetadataScraperService } from './services/metadata-scraper.service';
import { MetadataScheduleService } from './services/metadata-schedule.service';
import { ImageProxyService } from './services/image-proxy.service';
import { TmdbMediaType } from './dto/search-metadata.dto';

@ApiTags('元数据')
@Controller('metadata')
export class MetadataController {
  constructor(
    private readonly scraperService: MetadataScraperService,
    private readonly scheduleService: MetadataScheduleService,
    private readonly imageProxyService: ImageProxyService,
  ) {}

  // ============ 元数据搜索 ============

  @Get('search')
  @ApiOperation({ summary: '从TMDB搜索元数据' })
  @ApiQuery({ name: 'q', description: '搜索关键词' })
  @ApiQuery({ name: 'type', description: '媒体类型', enum: TmdbMediaType, required: false })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchMetadata(@Query('q') query: string, @Query('type') type?: TmdbMediaType) {
    return this.scraperService.searchFromTmdb(query, type);
  }

  // ============ 元数据刷新/刮削 ============

  @Post('refresh/:id')
  @ApiOperation({ summary: '刷新媒体元数据' })
  @ApiParam({ name: 'id', description: '媒体ID' })
  @ApiResponse({ status: 200, description: '刷新任务已提交' })
  async refreshMetadata(@Param('id', ParseUUIDPipe) id: string) {
    return this.scraperService.scrapeMedia(id);
  }

  @Post('scrape-all')
  @ApiOperation({ summary: '批量刮削所有媒体元数据' })
  @ApiQuery({ name: 'limit', description: '最大数量', required: false })
  @ApiResponse({ status: 200, description: '批量刮削完成' })
  async scrapeAll(@Query('limit') limit?: number) {
    return this.scraperService.scrapeAll(limit || 50);
  }

  // ============ 演员/导演信息 ============

  @Get(':id/credits')
  @ApiOperation({ summary: '获取媒体演员/导演信息' })
  @ApiParam({ name: 'id', description: '媒体ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMediaCredits(@Param('id', ParseUUIDPipe) id: string) {
    return this.scraperService.getMediaCredits(id);
  }

  @Get(':id/directors')
  @ApiOperation({ summary: '获取媒体导演信息' })
  @ApiParam({ name: 'id', description: '媒体ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDirectors(@Param('id', ParseUUIDPipe) id: string) {
    return this.scraperService.getDirectors(id);
  }

  // ============ 图片信息 ============

  @Get(':id/images')
  @ApiOperation({ summary: '获取媒体图片列表' })
  @ApiParam({ name: 'id', description: '媒体ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMediaImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.scraperService.getMediaImages(id);
  }

  // ============ 图片代理 ============

  @Get('images/proxy/:type/:size/*')
  @ApiExcludeEndpoint()
  async proxyImage(
    @Param('type') type: string,
    @Param('size') size: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 从URL中提取TMDB图片路径（/api/v1/metadata/images/proxy/poster/w500/abc.jpg -> /abc.jpg）
    const prefix = `/metadata/images/proxy/${type}/${size}`;
    const fullPath = req.path;
    const tmdbPath = fullPath.substring(fullPath.indexOf(prefix) + prefix.length);

    if (!tmdbPath) {
      throw new NotFoundException('图片路径无效');
    }

    const buffer = await this.imageProxyService.getImageBuffer(tmdbPath, size, type);
    if (!buffer) {
      throw new NotFoundException('图片不存在');
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ============ 定时任务管理 ============

  @Get('schedule/status')
  @ApiOperation({ summary: '获取定时任务状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getScheduleStatus() {
    return this.scheduleService.getStatus();
  }

  // ============ 图片缓存管理 ============

  @Get('cache/status')
  @ApiOperation({ summary: '获取图片缓存状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCacheStatus() {
    return this.imageProxyService.getCacheSize();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: '清理图片缓存' })
  @ApiQuery({ name: 'type', description: '图片类型', required: false })
  @ApiResponse({ status: 200, description: '清理完成' })
  async clearCache(@Query('type') type?: string) {
    const cleared = await this.imageProxyService.clearCache(type);
    return { cleared };
  }
}

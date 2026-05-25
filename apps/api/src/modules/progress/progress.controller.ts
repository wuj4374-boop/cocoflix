import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('进度')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: '获取观看历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getHistory(@Request() req: { user: { sub: string } }) {
    return this.progressService.findByUser(req.user.sub);
  }

  @Get(':mediaId')
  @ApiOperation({ summary: '获取指定媒体进度' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProgress(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.progressService.findByMedia(req.user.sub, mediaId);
  }

  @Put(':mediaId')
  @ApiOperation({ summary: '更新观看进度' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProgress(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Body() body: { episodeId?: string; progress: number; duration: number },
  ) {
    return this.progressService.updateProgress(
      req.user.sub,
      mediaId,
      body.episodeId || null,
      body.progress,
      body.duration,
    );
  }

  @Delete()
  @ApiOperation({ summary: '清空观看历史' })
  @ApiResponse({ status: 200, description: '清空成功' })
  async clearHistory(@Request() req: { user: { sub: string } }) {
    await this.progressService.clearHistory(req.user.sub);
    return { message: '历史已清空' };
  }

  @Delete(':mediaId')
  @ApiOperation({ summary: '删除单条观看记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async removeProgress(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    await this.progressService.removeProgress(req.user.sub, mediaId);
    return { message: '已删除' };
  }
}

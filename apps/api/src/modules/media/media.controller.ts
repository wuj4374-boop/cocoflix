import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('媒体')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: '获取媒体列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: PaginationDto) {
    return this.mediaService.findAll(query);
  }

  @Get('trending')
  @ApiOperation({ summary: '获取热门推荐' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTrending() {
    return this.mediaService.findTrending();
  }

  @Get('latest')
  @ApiOperation({ summary: '获取最新更新' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getLatest() {
    return this.mediaService.findLatest();
  }

  @Get('by-genre/:genre')
  @ApiOperation({ summary: '按分类获取媒体' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findByGenre(@Param('genre') genre: string, @Query() query: PaginationDto) {
    return this.mediaService.findByGenre(genre, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取媒体详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '媒体不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findById(id);
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: '获取媒体季列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findSeasons(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findSeasons(id);
  }

  @Get(':id/episodes')
  @ApiOperation({ summary: '获取剧集列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findEpisodes(@Query('seasonId', ParseUUIDPipe) seasonId: string) {
    return this.mediaService.findEpisodes(seasonId);
  }

  @Post()
  @ApiOperation({ summary: '创建媒体' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() createMediaDto: CreateMediaDto) {
    return this.mediaService.create(createMediaDto);
  }
}

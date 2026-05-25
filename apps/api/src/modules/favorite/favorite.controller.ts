import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('收藏')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getFavorites(@Request() req: { user: { sub: string } }) {
    return this.favoriteService.findByUser(req.user.sub);
  }

  @Get('check/:mediaId')
  @ApiOperation({ summary: '检查是否已收藏' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkFavorite(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    const isFavorite = await this.favoriteService.isFavorite(req.user.sub, mediaId);
    return { isFavorite };
  }

  @Post(':mediaId')
  @ApiOperation({ summary: '添加收藏' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 409, description: '已收藏' })
  async addFavorite(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.favoriteService.addFavorite(req.user.sub, mediaId);
  }

  @Delete(':mediaId')
  @ApiOperation({ summary: '取消收藏' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 404, description: '收藏不存在' })
  async removeFavorite(
    @Request() req: { user: { sub: string } },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    await this.favoriteService.removeFavorite(req.user.sub, mediaId);
    return { message: '已取消收藏' };
  }
}

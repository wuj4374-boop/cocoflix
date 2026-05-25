import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SuggestQueryDto,
  SimilarQueryDto,
} from './dto/search.dto';

@ApiTags('搜索')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '全文搜索', description: '基于标题和简介的模糊搜索' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Get('suggest')
  @ApiOperation({ summary: '联想搜索', description: '基于标题前缀的联想搜索' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async suggest(@Query() query: SuggestQueryDto) {
    return this.searchService.suggest(query);
  }

  @Get('similar/:id')
  @ApiOperation({ summary: '相似推荐', description: '基于分类的相似内容推荐' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findSimilar(
    @Param('id') id: string,
    @Query() query: SimilarQueryDto,
  ) {
    return this.searchService.findSimilar(id, query.limit ?? 6);
  }
}

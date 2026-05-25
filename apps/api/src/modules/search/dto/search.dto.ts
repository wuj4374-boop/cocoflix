import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MediaType } from '../../media/entities/media.entity';

export enum SortBy {
  RELEVANCE = 'relevance',
  RATING_DESC = 'rating_desc',
  RELEASE_DATE_DESC = 'release_date_desc',
  NEWEST = 'newest',
}

export class SearchQueryDto extends PaginationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ description: '搜索关键词', example: '战狼' })
  q!: string;

  @IsOptional()
  @IsEnum(MediaType)
  @ApiProperty({ description: '媒体类型', enum: MediaType, required: false })
  type?: MediaType;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: '分类slug', required: false })
  genre?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: '画质 (1080p/720p/480p)', required: false })
  quality?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  @ApiProperty({ description: '最低评分', required: false })
  minRating?: number;

  @IsOptional()
  @IsEnum(SortBy)
  @ApiProperty({ description: '排序方式', enum: SortBy, required: false, default: SortBy.RELEVANCE })
  sortBy?: SortBy;
}

export class SuggestQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ description: '搜索前缀', example: 'zhan' })
  q!: string;

  @IsOptional()
  @IsEnum(MediaType)
  @ApiProperty({ description: '媒体类型过滤', enum: MediaType, required: false })
  type?: MediaType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @ApiProperty({ description: '返回数量', default: 8, required: false })
  limit?: number;
}

export class SimilarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @ApiProperty({ description: '返回数量', default: 6, required: false })
  limit?: number;
}

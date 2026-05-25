import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType, VideoQuality } from '../types';

export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词', example: '三体' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: '资源类型过滤', enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  type?: SourceType;

  @ApiPropertyOptional({ description: '视频质量过滤', enum: VideoQuality })
  @IsOptional()
  @IsEnum(VideoQuality)
  quality?: VideoQuality;

  @ApiPropertyOptional({ description: '是否只返回剧集' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSeries?: boolean;

  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '搜索超时(ms)', default: 8000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  @Type(() => Number)
  timeout?: number;

  @ApiPropertyOptional({ description: '最大并发源数', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  maxConcurrency?: number;

  @ApiPropertyOptional({ description: '指定搜索的源ID列表' })
  @IsOptional()
  @IsString({ each: true })
  sources?: string[];
}

export class RegisterSourceDto {
  @ApiProperty({ description: '源ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '源名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '源类型', enum: SourceType })
  @IsEnum(SourceType)
  type: SourceType;

  @ApiProperty({ description: 'API基础URL' })
  @IsString()
  baseUrl: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: '优先级(数字越小优先级越高)', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  priority?: number = 10;

  @ApiPropertyOptional({ description: '请求超时(ms)', default: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  @Type(() => Number)
  timeout?: number = 10000;

  @ApiPropertyOptional({ description: '重试次数', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  retryCount?: number = 3;

  @ApiPropertyOptional({ description: '额外配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CircuitResetDto {
  @ApiProperty({ description: '源ID' })
  @IsString()
  sourceId: string;
}

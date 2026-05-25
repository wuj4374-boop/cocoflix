import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { MediaType } from '../entities/media.entity';

export class CreateMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({ description: '媒体标题' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ description: '原始标题', required: false })
  originalTitle?: string;

  @IsEnum(MediaType)
  @ApiProperty({ description: '媒体类型', enum: MediaType })
  type: MediaType;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: '简介', required: false })
  overview?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  @ApiProperty({ description: '海报URL', required: false })
  posterUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  @ApiProperty({ description: '背景图URL', required: false })
  backdropUrl?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: '评分', required: false })
  rating?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: '质量', required: false })
  quality?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  @ApiProperty({ description: '源URL', required: false })
  sourceUrl?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: '时长(秒)', required: false })
  duration?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'TMDB ID', required: false })
  tmdbId?: number;
}

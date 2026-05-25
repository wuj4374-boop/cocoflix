import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TmdbMediaType {
  MOVIE = 'movie',
  TV = 'tv',
}

export class SearchMetadataDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '搜索关键词' })
  query: string;

  @IsOptional()
  @IsEnum(TmdbMediaType)
  @ApiProperty({ description: '媒体类型', enum: TmdbMediaType, required: false })
  type?: TmdbMediaType;
}

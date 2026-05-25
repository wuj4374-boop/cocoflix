import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { TmdbMediaType } from './search-metadata.dto';

export class ScrapeMediaDto {
  @IsUUID()
  @ApiProperty({ description: '媒体ID' })
  mediaId: string;
}

export class MatchTmdbDto {
  @IsUUID()
  @ApiProperty({ description: '媒体ID' })
  mediaId: string;

  @IsOptional()
  @IsEnum(TmdbMediaType)
  @ApiProperty({ description: 'TMDB媒体类型', enum: TmdbMediaType, required: false })
  type?: TmdbMediaType;
}

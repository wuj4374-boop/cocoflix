import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: '剧集ID', required: false })
  episodeId?: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ description: '当前进度(秒)' })
  progress: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ description: '总时长(秒)' })
  duration: number;
}

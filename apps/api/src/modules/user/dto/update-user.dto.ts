import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiProperty({ description: '用户名', required: false })
  username?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ description: '邮箱', required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ description: '头像URL', required: false })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ description: '个人简介', required: false })
  bio?: string;
}

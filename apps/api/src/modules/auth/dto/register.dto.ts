import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  @ApiProperty({ description: '密码', example: 'password123' })
  password: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ description: '邮箱', required: false, example: 'admin@cocoflix.com' })
  email?: string;
}

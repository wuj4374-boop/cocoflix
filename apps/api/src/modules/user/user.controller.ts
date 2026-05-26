import { Controller, Get, Put, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const avatarStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const storagePath = process.env.STORAGE_PATH || join(process.cwd(), '..', '..', 'storage');
    const dir = join(storagePath, 'avatars');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('用户')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProfile(@Request() req: { user: { sub: string } }) {
    return this.userService.findById(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(req.user.sub, updateUserDto);
  }

  @Put('preferences')
  @ApiOperation({ summary: '更新用户偏好设置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updatePreferences(
    @Request() req: { user: { sub: string } },
    @Body() preferences: Record<string, unknown>,
  ) {
    await this.userService.updatePreferences(req.user.sub, preferences);
    return { message: '偏好设置已更新' };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
        return cb(new BadRequestException('仅支持 jpg/png/webp/gif 格式'), false);
      }
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传头像' })
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadAvatar(
    @Request() req: { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择图片');
    }
    const avatarUrl = `/api/v1/avatars/${file.filename}`;
    return this.userService.update(req.user.sub, { avatarUrl });
  }
}

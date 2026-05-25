import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class ImageProxyService implements OnModuleInit {
  private readonly logger = new Logger(ImageProxyService.name);
  private readonly imageBaseUrl: string;
  private readonly cacheDir: string;
  private readonly proxyEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.imageBaseUrl = this.configService.get<string>(
      'tmdb.imageBaseUrl',
      'https://image.tmdb.org/t/p',
    );
    this.cacheDir = this.configService.get<string>(
      'tmdb.imageCacheDir',
      './storage/tmdb-images',
    );
    this.proxyEnabled = this.configService.get<boolean>(
      'tmdb.imageProxyEnabled',
      true,
    );
  }

  async onModuleInit(): Promise<void> {
    if (this.proxyEnabled) {
      await this.ensureCacheDir();
      this.logger.log(`图片缓存目录: ${this.cacheDir}`);
    }
  }

  private async ensureCacheDir(): Promise<void> {
    const dirs = ['poster', 'backdrop', 'still', 'profile', 'logo'];
    for (const dir of dirs) {
      const fullPath = path.join(this.cacheDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  // ============ 图片代理URL生成 ============

  getProxyUrl(tmdbPath: string, size: string = 'w500', type: string = 'poster'): string {
    if (!this.proxyEnabled) {
      return `${this.imageBaseUrl}/${size}${tmdbPath}`;
    }
    return `/api/v1/metadata/images/proxy/${type}/${size}${tmdbPath}`;
  }

  getProxyPosterUrl(tmdbPath: string | null, size: string = 'w500'): string | null {
    if (!tmdbPath) return null;
    return this.getProxyUrl(tmdbPath, size, 'poster');
  }

  getProxyBackdropUrl(tmdbPath: string | null, size: string = 'w1280'): string | null {
    if (!tmdbPath) return null;
    return this.getProxyUrl(tmdbPath, size, 'backdrop');
  }

  getProxyProfileUrl(tmdbPath: string | null, size: string = 'w185'): string | null {
    if (!tmdbPath) return null;
    return this.getProxyUrl(tmdbPath, size, 'profile');
  }

  getProxyStillUrl(tmdbPath: string | null, size: string = 'w300'): string | null {
    if (!tmdbPath) return null;
    return this.getProxyUrl(tmdbPath, size, 'still');
  }

  // ============ 图片下载与缓存 ============

  async downloadImage(tmdbPath: string, size: string, type: string): Promise<string | null> {
    const localFileName = `${size}_${tmdbPath.replace(/\//g, '_')}`;
    const localPath = path.join(this.cacheDir, type, localFileName);

    try {
      await fs.access(localPath);
      return localPath;
    } catch {
      // 文件不存在，需要下载
    }

    try {
      const url = `${this.imageBaseUrl}/${size}${tmdbPath}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      await fs.writeFile(localPath, response.data);
      this.logger.debug(`图片已缓存: ${localPath}`);
      return localPath;
    } catch (error) {
      this.logger.error(`图片下载失败 [${tmdbPath}]: ${(error as Error).message}`);
      return null;
    }
  }

  async getImageBuffer(tmdbPath: string, size: string, type: string): Promise<Buffer | null> {
    if (!this.proxyEnabled) return null;

    const localPath = await this.downloadImage(tmdbPath, size, type);
    if (!localPath) return null;

    try {
      return await fs.readFile(localPath);
    } catch (error) {
      this.logger.error(`读取缓存图片失败 [${localPath}]: ${(error as Error).message}`);
      return null;
    }
  }

  // ============ 缓存管理 ============

  async getCacheSize(): Promise<{ total: number; byType: Record<string, number> }> {
    const byType: Record<string, number> = {};
    let total = 0;

    const types = ['poster', 'backdrop', 'still', 'profile', 'logo'];
    for (const type of types) {
      const dirPath = path.join(this.cacheDir, type);
      try {
        const files = await fs.readdir(dirPath);
        let typeSize = 0;
        for (const file of files) {
          const stat = await fs.stat(path.join(dirPath, file));
          typeSize += stat.size;
        }
        byType[type] = typeSize;
        total += typeSize;
      } catch {
        byType[type] = 0;
      }
    }

    return { total, byType };
  }

  async clearCache(type?: string): Promise<number> {
    let cleared = 0;

    if (type) {
      const dirPath = path.join(this.cacheDir, type);
      try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          await fs.unlink(path.join(dirPath, file));
          cleared++;
        }
      } catch {
        this.logger.warn(`清理缓存目录失败: ${type}`);
      }
    } else {
      const types = ['poster', 'backdrop', 'still', 'profile', 'logo'];
      for (const t of types) {
        cleared += await this.clearCache(t);
      }
    }

    this.logger.log(`已清理 ${cleared} 个缓存图片${type ? ` (${type})` : ''}`);
    return cleared;
  }

  async downloadBatch(
    images: Array<{ tmdbPath: string; size: string; type: string }>,
    concurrency = 3,
  ): Promise<number> {
    let downloaded = 0;
    const chunks: typeof images[] = [];

    for (let i = 0; i < images.length; i += concurrency) {
      chunks.push(images.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((img) => this.downloadImage(img.tmdbPath, img.size, img.type)),
      );
      downloaded += results.filter(
        (r) => r.status === 'fulfilled' && r.value !== null,
      ).length;
    }

    this.logger.log(`批量下载完成: ${downloaded}/${images.length}`);
    return downloaded;
  }
}

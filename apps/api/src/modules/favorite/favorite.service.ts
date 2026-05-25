import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  async findByUser(userId: string): Promise<Favorite[]> {
    return this.favoriteRepository.find({
      where: { userId },
      relations: ['media'],
      order: { createdAt: 'DESC' },
    });
  }

  async isFavorite(userId: string, mediaId: string): Promise<boolean> {
    const count = await this.favoriteRepository.count({
      where: { userId, mediaId },
    });
    return count > 0;
  }

  async addFavorite(userId: string, mediaId: string): Promise<Favorite> {
    const existing = await this.favoriteRepository.findOne({
      where: { userId, mediaId },
    });

    if (existing) {
      throw new ConflictException('已收藏');
    }

    const favorite = this.favoriteRepository.create({ userId, mediaId });
    return this.favoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, mediaId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, mediaId },
    });

    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    await this.favoriteRepository.remove(favorite);
  }
}

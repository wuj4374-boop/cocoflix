import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Progress } from './entities/progress.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private readonly progressRepository: Repository<Progress>,
  ) {}

  async findByUser(userId: string): Promise<Progress[]> {
    return this.progressRepository.find({
      where: { userId },
      relations: ['media', 'episode'],
      order: { lastWatch: 'DESC' },
    });
  }

  async findByMedia(userId: string, mediaId: string): Promise<Progress | null> {
    return this.progressRepository.findOne({
      where: { userId, mediaId },
      relations: ['episode'],
    });
  }

  async updateProgress(
    userId: string,
    mediaId: string,
    episodeId: string | null,
    progress: number,
    duration: number,
  ): Promise<Progress> {
    let record = await this.progressRepository.findOne({
      where: { userId, mediaId, episodeId: episodeId || undefined },
    });

    if (!record) {
      record = this.progressRepository.create({
        userId,
        mediaId,
        episodeId: episodeId || undefined,
        progress,
        duration,
        lastWatch: new Date(),
        completed: progress >= duration * 0.9,
      });
    } else {
      record.progress = progress;
      record.duration = duration;
      record.lastWatch = new Date();
      record.completed = progress >= duration * 0.9;
    }

    return this.progressRepository.save(record);
  }

  async removeProgress(userId: string, mediaId: string): Promise<void> {
    const records = await this.progressRepository.find({
      where: { userId, mediaId },
    });
    if (records.length > 0) {
      await this.progressRepository.remove(records);
    }
  }

  async clearHistory(userId: string): Promise<void> {
    const records = await this.progressRepository.find({
      where: { userId },
    });
    if (records.length > 0) {
      await this.progressRepository.remove(records);
    }
  }
}

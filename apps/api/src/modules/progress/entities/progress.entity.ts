import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { Media } from '../../media/entities/media.entity';
import { Episode } from '../../media/entities/episode.entity';

@Entity('progress')
@Unique(['userId', 'mediaId', 'episodeId'])
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ name: 'episode_id', nullable: true })
  episodeId: string;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ type: 'integer', default: 0 })
  duration: number;

  @Column({ type: 'datetime', default: () => "datetime('now')", name: 'last_watch' })
  lastWatch: Date;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.progresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @ManyToOne(() => Episode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;
}

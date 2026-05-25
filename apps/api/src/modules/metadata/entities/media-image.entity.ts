import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Media } from '../../media/entities/media.entity';

export enum ImageType {
  POSTER = 'poster',
  BACKDROP = 'backdrop',
  STILL = 'still',
  LOGO = 'logo',
}

@Entity('media_images')
@Index(['mediaId', 'type'])
export class MediaImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ type: 'varchar', length: 20 })
  type: ImageType;

  @Column({ length: 500, name: 'tmdb_path' })
  tmdbPath: string;

  @Column({ length: 500, nullable: true, name: 'local_path' })
  localPath: string;

  @Column({ length: 20, nullable: true, name: 'iso_639_1' })
  iso6391: string;

  @Column({ type: 'integer', nullable: true })
  width: number;

  @Column({ type: 'integer', nullable: true })
  height: number;

  @Column({ type: 'real', nullable: true, name: 'aspect_ratio' })
  aspectRatio: number;

  @Column({ type: 'real', nullable: true, name: 'vote_average' })
  voteAverage: number;

  @Column({ type: 'integer', nullable: true, name: 'vote_count' })
  voteCount: number;

  @Column({ type: 'integer', nullable: true, name: 'season_number' })
  seasonNumber: number;

  @Column({ type: 'integer', nullable: true, name: 'episode_number' })
  episodeNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;
}

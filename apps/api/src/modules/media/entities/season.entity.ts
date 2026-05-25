import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Media } from './media.entity';
import { Episode } from './episode.entity';

@Entity('seasons')
@Unique(['mediaId', 'number'])
export class Season {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ type: 'integer' })
  number: number;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ length: 500, nullable: true, name: 'poster_url' })
  posterUrl: string;

  @Column({ type: 'date', nullable: true, name: 'air_date' })
  airDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Media, (media) => media.seasons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @OneToMany(() => Episode, (episode) => episode.season)
  episodes: Episode[];
}

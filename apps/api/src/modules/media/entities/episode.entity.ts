import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { Season } from './season.entity';

@Entity('episodes')
@Unique(['seasonId', 'number'])
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'season_id' })
  seasonId: string;

  @Column({ type: 'integer' })
  number: number;

  @Column({ length: 500, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ type: 'date', nullable: true, name: 'air_date' })
  airDate: Date;

  @Column({ length: 500, nullable: true, name: 'hls_path' })
  hlsPath: string;

  @Column({ length: 1000, nullable: true, name: 'source_url' })
  sourceUrl: string;

  @Column({ length: 500, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Season, (season) => season.episodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'season_id' })
  season: Season;
}

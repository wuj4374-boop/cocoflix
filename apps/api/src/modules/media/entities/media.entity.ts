import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { Season } from './season.entity';
import { Genre } from './genre.entity';

export enum MediaType {
  MOVIE = 'movie',
  TV = 'tv',
  ANIME = 'anime',
  VARIETY = 'variety',
}

export enum MediaStatus {
  ACTIVE = 'active',
  PROCESSING = 'processing',
  UNAVAILABLE = 'unavailable',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ length: 500, nullable: true, name: 'original_title' })
  originalTitle: string;

  @Column({ type: 'varchar', length: 20 })
  type: MediaType;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ length: 500, nullable: true, name: 'poster_url' })
  posterUrl: string;

  @Column({ length: 500, nullable: true, name: 'backdrop_url' })
  backdropUrl: string;

  @Column({ type: 'real', nullable: true })
  rating: number;

  @Column({ type: 'date', nullable: true, name: 'release_date' })
  releaseDate: Date;

  @Column({ type: 'varchar', length: 20, default: MediaStatus.ACTIVE })
  status: MediaStatus;

  @Column({ length: 20, nullable: true })
  quality: string;

  @Column({ length: 1000, nullable: true, name: 'source_url' })
  sourceUrl: string;

  @Column({ length: 500, nullable: true, name: 'hls_path' })
  hlsPath: string;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ type: 'integer', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'integer', nullable: true, name: 'tmdb_id' })
  tmdbId: number;

  @Column({ length: 20, nullable: true, name: 'imdb_id' })
  imdbId: string;

  @Column({ length: 20, nullable: true, name: 'douban_id' })
  doubanId: string;

  @Column({ type: 'simple-json', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Season, (season) => season.media)
  seasons: Season[];

  @ManyToMany(() => Genre, (genre) => genre.media)
  @JoinTable({
    name: 'media_genres',
    joinColumn: { name: 'media_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];
}

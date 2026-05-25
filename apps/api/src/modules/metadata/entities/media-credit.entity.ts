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

export enum CreditType {
  CAST = 'cast',
  CREW = 'crew',
}

@Entity('media_credits')
@Index(['mediaId', 'type'])
@Index(['mediaId', 'tmdbPersonId'])
export class MediaCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ type: 'integer', name: 'tmdb_person_id' })
  tmdbPersonId: number;

  @Column({ type: 'varchar', length: 20 })
  type: CreditType;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true, name: 'original_name' })
  originalName: string;

  @Column({ length: 500, nullable: true, name: 'profile_path' })
  profilePath: string;

  @Column({ length: 255, nullable: true })
  character: string;

  @Column({ length: 100, nullable: true })
  job: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @Column({ type: 'integer', nullable: true })
  gender: number;

  @Column({ type: 'real', nullable: true })
  popularity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;
}

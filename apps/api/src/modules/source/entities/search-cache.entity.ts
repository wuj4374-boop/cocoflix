import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('search_caches')
export class SearchCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'cache_key', length: 255 })
  cacheKey: string;

  @Column({ type: 'simple-json' })
  data: unknown;

  @Column({ name: 'expires_at', type: 'text' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

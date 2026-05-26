import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sources')
export class Source {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 500, nullable: true })
  url: string;

  @Column({ type: 'simple-json', default: () => "'{}'" })
  config: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'integer', default: 10 })
  priority: number;

  @Column({ type: 'integer', default: 10000 })
  timeout: number;

  @Column({ type: 'integer', default: 3, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'simple-json', nullable: true })
  health: Record<string, unknown>;

  @Column({ type: 'text', nullable: true, name: 'last_scan' })
  lastScan: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

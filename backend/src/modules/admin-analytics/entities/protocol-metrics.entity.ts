import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('protocol_metrics')
@Index(['snapshotDate'], { unique: true })
export class ProtocolMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  snapshotDate: Date;

  @Column('decimal', { precision: 20, scale: 2 })
  totalValueLockedUsd: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalValueLockedXlm: number;

  @Column('int')
  savingsProductCount: number;

  @Column('jsonb', { nullable: true })
  productBreakdown: Record<string, any> | null;

  @Column('jsonb', { nullable: true })
  connectionMetrics: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('rebalancing_executions')
@Index(['userId', 'createdAt'])
export class RebalancingExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar' })
  riskProfile!: 'conservative' | 'balanced' | 'growth';

  @Column({ type: 'jsonb' })
  recommendation!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  executionResult!: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'EXECUTED' })
  status!: 'EXECUTED' | 'FAILED';

  @CreateDateColumn()
  createdAt!: Date;
}

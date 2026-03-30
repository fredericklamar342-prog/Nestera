import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserSubscription } from './user-subscription.entity';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  subscriptionId: string;

  @Column('decimal', { precision: 18, scale: 7 })
  amount: number;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  penalty: number;

  @Column('decimal', { precision: 18, scale: 7 })
  netAmount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', nullable: true })
  txHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  estimatedCompletionTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserSubscription, { eager: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: UserSubscription;
}

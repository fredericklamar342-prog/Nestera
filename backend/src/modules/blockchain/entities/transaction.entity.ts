import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum LedgerTransactionType {
  DEPOSIT = 'DEPOSIT',
  YIELD = 'YIELD',
}

@Entity('transactions')
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_transactions_user_id')
  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: LedgerTransactionType })
  type: LedgerTransactionType;

  @Column('decimal', { precision: 20, scale: 7 })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  publicKey: string | null;

  @Index('idx_transactions_event_id', { unique: true })
  @Column({ type: 'varchar' })
  eventId: string;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'bigint', nullable: true })
  ledgerSequence: string | null;

  @Column({ type: 'varchar', nullable: true })
  poolId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum KycProvider {
  ONFIDO = 'ONFIDO',
  JUMIO = 'JUMIO',
  SUMSUB = 'SUMSUB',
}

export enum KycVerificationStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('kyc_verifications')
@Index(['userId', 'createdAt'])
@Index(['providerReference'], { unique: true })
export class KycVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'enum', enum: KycProvider })
  provider!: KycProvider;

  @Column({ type: 'varchar', unique: true })
  providerReference!: string;

  @Column({
    type: 'enum',
    enum: KycVerificationStatus,
    default: KycVerificationStatus.INITIATED,
  })
  status!: KycVerificationStatus;

  @Column({ type: 'text', nullable: true })
  encryptedPii!: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedProviderResponse!: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedWebhookPayload!: string | null;

  @Column({ type: 'varchar', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

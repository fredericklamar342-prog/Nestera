import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum BackupStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RESTORE_TEST_PASSED = 'restore_test_passed',
  RESTORE_TEST_FAILED = 'restore_test_failed',
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  s3Key: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'int' })
  durationMs: number;

  @Column({ type: 'enum', enum: BackupStatus })
  status: BackupStatus;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}

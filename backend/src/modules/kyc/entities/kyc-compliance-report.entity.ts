import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('kyc_compliance_reports')
@Index(['generatedAt'])
@Index(['status'])
export class KycComplianceReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  regulator!: string;

  @Column({ type: 'varchar' })
  period!: string;

  @Column({ type: 'varchar' })
  status!: 'DRAFT' | 'FINAL';

  @Column({ type: 'jsonb' })
  summary!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn()
  generatedAt!: Date;
}

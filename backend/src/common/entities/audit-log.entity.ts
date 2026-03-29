import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * AuditLog Entity
 * 
 * Stores structured audit entries for all trade and dispute mutations.
 * Enables forensic traceability and incident debugging.
 * 
 * Indexed by:
 * - correlation_id: Trace full request lifecycle
 * - resource_id: Find all mutations for a specific trade/dispute
 * - actor: Find all actions by a user
 * - timestamp: Time-range queries
 * - action: Filter by mutation type
 */
@Entity('audit_logs')
@Index('idx_audit_logs_correlation_id', ['correlationId'])
@Index('idx_audit_logs_resource_id', ['resourceId'])
@Index('idx_audit_logs_actor', ['actor'])
@Index('idx_audit_logs_timestamp', ['timestamp'])
@Index('idx_audit_logs_action', ['action'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    correlationId: string;

    @CreateDateColumn()
    timestamp: Date;

    @Column()
    endpoint: string;

    @Column()
    method: string;

    @Column()
    action: string; // CREATE, UPDATE, DELETE

    @Column()
    actor: string; // wallet or email

    @Column({ nullable: true, type: 'uuid' })
    resourceId: string | null;

    @Column()
    resourceType: string; // TRADE, DISPUTE, CLAIM

    @Column()
    statusCode: number;

    @Column()
    durationMs: number;

    @Column({ default: true })
    success: boolean;

    @Column({ nullable: true, type: 'text' })
    errorMessage: string | null;
}

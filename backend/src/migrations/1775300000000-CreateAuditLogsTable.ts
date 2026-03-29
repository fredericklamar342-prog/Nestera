import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuditLogsTable1775300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'audit_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'correlation_id',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'Request correlation ID for tracing',
                    },
                    {
                        name: 'timestamp',
                        type: 'timestamp',
                        isNullable: false,
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'endpoint',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'API endpoint path',
                    },
                    {
                        name: 'method',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'HTTP method (POST, PATCH, PUT, DELETE)',
                    },
                    {
                        name: 'action',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'Action type (CREATE, UPDATE, DELETE)',
                    },
                    {
                        name: 'actor',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'User wallet or email performing action',
                    },
                    {
                        name: 'resource_id',
                        type: 'uuid',
                        isNullable: true,
                        comment: 'ID of affected resource (trade, dispute, claim)',
                    },
                    {
                        name: 'resource_type',
                        type: 'varchar',
                        isNullable: false,
                        comment: 'Type of resource (TRADE, DISPUTE, CLAIM)',
                    },
                    {
                        name: 'status_code',
                        type: 'int',
                        isNullable: false,
                        comment: 'HTTP response status code',
                    },
                    {
                        name: 'duration_ms',
                        type: 'int',
                        isNullable: false,
                        comment: 'Request duration in milliseconds',
                    },
                    {
                        name: 'success',
                        type: 'boolean',
                        isNullable: false,
                        default: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                        comment: 'Error message if request failed',
                    },
                ],
                indices: [
                    {
                        name: 'idx_audit_logs_correlation_id',
                        columnNames: ['correlation_id'],
                    },
                    {
                        name: 'idx_audit_logs_resource_id',
                        columnNames: ['resource_id'],
                    },
                    {
                        name: 'idx_audit_logs_actor',
                        columnNames: ['actor'],
                    },
                    {
                        name: 'idx_audit_logs_timestamp',
                        columnNames: ['timestamp'],
                    },
                    {
                        name: 'idx_audit_logs_action',
                        columnNames: ['action'],
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('audit_logs');
    }
}

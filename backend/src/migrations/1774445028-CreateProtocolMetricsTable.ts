import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProtocolMetricsTable1774445028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'protocol_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'snapshotDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'totalValueLockedUsd',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'totalValueLockedXlm',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'savingsProductCount',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'productBreakdown',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create unique index on snapshotDate
    await queryRunner.createIndex(
      'protocol_metrics',
      new TableIndex({
        name: 'IDX_protocol_metrics_snapshotDate',
        columnNames: ['snapshotDate'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('protocol_metrics');
  }
}

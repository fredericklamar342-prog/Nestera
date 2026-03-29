import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSavingsGoalsTable1775100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'savings_goals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'goalName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'targetAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'targetDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['IN_PROGRESS', 'COMPLETED'],
            default: "'IN_PROGRESS'",
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'savings_goals',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index on userId for faster lookups
    await queryRunner.createIndex(
      'savings_goals',
      new TableIndex({
        name: 'IDX_SAVINGS_GOALS_USER_ID',
        columnNames: ['userId'],
      }),
    );

    // Create index on status for filtering active/completed goals
    await queryRunner.createIndex(
      'savings_goals',
      new TableIndex({
        name: 'IDX_SAVINGS_GOALS_STATUS',
        columnNames: ['status'],
      }),
    );

    // Create index on targetDate for date-based queries
    await queryRunner.createIndex(
      'savings_goals',
      new TableIndex({
        name: 'IDX_SAVINGS_GOALS_TARGET_DATE',
        columnNames: ['targetDate'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('savings_goals');
  }
}

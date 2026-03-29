import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddWeb3PropertiesToUser1740345600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add walletAddress column with unique constraint
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'walletAddress',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Add nonce column for login challenge
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'nonce',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Create unique index on walletAddress
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_WALLET_ADDRESS',
        columnNames: ['walletAddress'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index
    await queryRunner.dropIndex('users', 'IDX_WALLET_ADDRESS');

    // Drop the columns
    await queryRunner.dropColumn('users', 'nonce');
    await queryRunner.dropColumn('users', 'walletAddress');
  }
}

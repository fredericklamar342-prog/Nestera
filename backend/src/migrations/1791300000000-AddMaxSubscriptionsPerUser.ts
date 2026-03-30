import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMaxSubscriptionsPerUser1791300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'savings_products',
      new TableColumn({
        name: 'maxSubscriptionsPerUser',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('savings_products', 'maxSubscriptionsPerUser');
  }
}

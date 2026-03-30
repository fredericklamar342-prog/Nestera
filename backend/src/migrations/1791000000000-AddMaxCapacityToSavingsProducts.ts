import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMaxCapacityToSavingsProducts1791000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'savings_products',
      new TableColumn({
        name: 'maxCapacity',
        type: 'decimal',
        precision: 14,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('savings_products', 'maxCapacity');
  }
}

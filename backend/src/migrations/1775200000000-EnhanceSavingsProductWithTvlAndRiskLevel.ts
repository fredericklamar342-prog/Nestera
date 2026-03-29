import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableColumnOptions,
} from 'typeorm';

export class EnhanceSavingsProductWithTvlAndRiskLevel1775200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tvlAmount column if it doesn't exist
    const table = await queryRunner.getTable('savings_products');
    
    if (table && !table.findColumnByName('tvlAmount')) {
      await queryRunner.addColumn(
        'savings_products',
        new TableColumn({
          name: 'tvlAmount',
          type: 'decimal',
          precision: 14,
          scale: 2,
          default: 0,
          isNullable: false,
        }),
      );
    }

    // Update riskLevel column from varchar to enum
    if (table && table.findColumnByName('riskLevel')) {
      const riskLevelColumn = table.findColumnByName('riskLevel');
      
      if (riskLevelColumn && riskLevelColumn.type !== 'enum') {
        // Drop the old constraint and column with old data
        await queryRunner.changeColumn(
          'savings_products',
          'riskLevel',
          new TableColumn({
            name: 'riskLevel',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            default: "'LOW'",
            isNullable: false,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('savings_products');

    // Remove tvlAmount column
    if (table && table.findColumnByName('tvlAmount')) {
      await queryRunner.dropColumn('savings_products', 'tvlAmount');
    }

    // Revert riskLevel column back to varchar
    if (table && table.findColumnByName('riskLevel')) {
      await queryRunner.changeColumn(
        'savings_products',
        'riskLevel',
        new TableColumn({
          name: 'riskLevel',
          type: 'varchar',
          length: '20',
          default: "'Low'",
          isNullable: false,
        }),
      );
    }
  }
}

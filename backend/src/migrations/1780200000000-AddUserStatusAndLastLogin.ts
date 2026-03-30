import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatusAndLastLogin1780200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS last_login_at;
    `);
  }
}

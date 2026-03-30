import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBackupRecordsTable1780100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE backup_status_enum AS ENUM (
        'success', 'failed', 'restore_test_passed', 'restore_test_failed'
      );

      CREATE TABLE backup_records (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename    VARCHAR NOT NULL,
        s3_key      VARCHAR NOT NULL,
        size_bytes  BIGINT NOT NULL DEFAULT 0,
        duration_ms INT NOT NULL DEFAULT 0,
        status      backup_status_enum NOT NULL,
        error_message TEXT,
        expires_at  TIMESTAMP,
        created_at  TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_backup_records_status_created
        ON backup_records (status, created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS backup_records;
      DROP TYPE IF EXISTS backup_status_enum;
    `);
  }
}

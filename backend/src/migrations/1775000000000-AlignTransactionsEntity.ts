import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignTransactionsEntity1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactions_type_enum') THEN
          CREATE TYPE "transactions_type_enum" AS ENUM ('DEPOSIT', 'WITHDRAW', 'SWAP', 'YIELD');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'transactions' AND column_name = 'type'
        ) THEN
          ALTER TABLE "transactions"
          ALTER COLUMN "type" TYPE "transactions_type_enum"
          USING (
            CASE
              WHEN "type" IN ('DEPOSIT', 'WITHDRAW', 'SWAP', 'YIELD') THEN "type"
              ELSE 'YIELD'
            END
          )::"transactions_type_enum";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "amount" TYPE DECIMAL(18,7);
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "txHash" varchar;
    `);

    await queryRunner.query(`
      UPDATE "transactions"
      SET "txHash" = COALESCE("transactionHash", "eventId", "id"::text)
      WHERE "txHash" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "txHash" SET NOT NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_transactions_txHash'
        ) THEN
          ALTER TABLE "transactions"
          ADD CONSTRAINT "UQ_transactions_txHash" UNIQUE ("txHash");
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactions_status_enum') THEN
          CREATE TYPE "transactions_status_enum" AS ENUM ('COMPLETED', 'PENDING', 'FAILED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "status" "transactions_status_enum" NOT NULL DEFAULT 'COMPLETED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN IF EXISTS "status";
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactions_status_enum') THEN
          DROP TYPE "transactions_status_enum";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT IF EXISTS "UQ_transactions_txHash";
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN IF EXISTS "txHash";
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "amount" TYPE DECIMAL(20,7);
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "type" TYPE varchar USING "type"::text;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactions_type_enum') THEN
          DROP TYPE "transactions_type_enum";
        END IF;
      END
      $$;
    `);
  }
}

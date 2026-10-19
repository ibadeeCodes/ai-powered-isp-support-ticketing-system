import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiAnalysesTable1725540000002 implements MigrationInterface {
  name = 'CreateAiAnalysesTable1725540000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enums (guard against duplicates for idempotent runs)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ai_analyses_category_enum" AS ENUM('CONNECTIVITY', 'HARDWARE', 'BILLING', 'INSTALLATION', 'PACKAGE', 'ACCOUNT', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ai_analyses_severity_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ai_analyses_sentiment_enum" AS ENUM('NEUTRAL', 'CONCERNED', 'FRUSTRATED', 'ANGRY');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ai_analyses_status_enum" AS ENUM('COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create ai_analyses table
    // Relationship decision: tickets 1:N ai_analyses (NOT 1:1) so analyses can
    // be re-run/versioned over time; newest row per ticket is the current one.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_analyses" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" UUID NOT NULL,
        "category" "ai_analyses_category_enum",
        "issue_type" VARCHAR(100),
        "severity" "ai_analyses_severity_enum",
        "sentiment" "ai_analyses_sentiment_enum",
        "intent" VARCHAR(100),
        "requires_technician" BOOLEAN,
        "confidence" DOUBLE PRECISION,
        "model" VARCHAR(100) NOT NULL,
        "prompt_version" VARCHAR(20) NOT NULL,
        "input_tokens" INTEGER,
        "output_tokens" INTEGER,
        "latency_ms" INTEGER,
        "status" "ai_analyses_status_enum" NOT NULL DEFAULT 'COMPLETED',
        "failure_reason" VARCHAR(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_ai_analyses_ticket" FOREIGN KEY ("ticket_id")
          REFERENCES "tickets"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ai_analyses_ticket_id" ON "ai_analyses" ("ticket_id");
      CREATE INDEX IF NOT EXISTS "idx_ai_analyses_status" ON "ai_analyses" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_analyses";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_analyses_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_analyses_sentiment_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_analyses_severity_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_analyses_category_enum";`);
  }
}

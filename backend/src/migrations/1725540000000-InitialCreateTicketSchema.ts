import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCreateTicketSchema1725540000000 implements MigrationInterface {
  name = 'InitialCreateTicketSchema1725540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create pgcrypto extension for UUID generation if not exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Create Sequence for human-readable Ticket Numbers (TIC-1001, etc.)
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;`);

    // 3. Create customers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "phone" VARCHAR(50) NOT NULL UNIQUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Enums for Ticket Status and Priority
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tickets_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tickets_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Create tickets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_number" VARCHAR(50) NOT NULL UNIQUE,
        "subject" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "status" "tickets_status_enum" NOT NULL DEFAULT 'OPEN',
        "priority" "tickets_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "customer_id" UUID NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_tickets_customer" FOREIGN KEY ("customer_id") 
          REFERENCES "customers"("id") ON DELETE CASCADE
      );
    `);

    // 6. Create Indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_tickets_ticket_number" ON "tickets" ("ticket_number");
      CREATE INDEX IF NOT EXISTS "idx_tickets_customer_id" ON "tickets" ("customer_id");
      CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "tickets" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tickets_priority_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tickets_status_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers";`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS ticket_number_seq;`);
  }
}


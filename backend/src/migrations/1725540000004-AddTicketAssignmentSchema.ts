import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketAssignmentSchema1725540000004 implements MigrationInterface {
  name = 'AddTicketAssignmentSchema1725540000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create support_teams table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_teams" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add support_team_id column to users table
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "support_team_id" UUID;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_support_team'
        ) THEN
          ALTER TABLE "users"
            ADD CONSTRAINT "fk_users_support_team"
            FOREIGN KEY ("support_team_id")
            REFERENCES "support_teams"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_support_team_id" ON "users" ("support_team_id");
    `);

    // 3. Add assigned_team_id and assigned_agent_id columns to tickets table
    await queryRunner.query(`
      ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_team_id" UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_agent_id" UUID;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_assigned_team'
        ) THEN
          ALTER TABLE "tickets"
            ADD CONSTRAINT "fk_tickets_assigned_team"
            FOREIGN KEY ("assigned_team_id")
            REFERENCES "support_teams"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_assigned_agent'
        ) THEN
          ALTER TABLE "tickets"
            ADD CONSTRAINT "fk_tickets_assigned_agent"
            FOREIGN KEY ("assigned_agent_id")
            REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_team_id" ON "tickets" ("assigned_team_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_agent_id" ON "tickets" ("assigned_agent_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "fk_tickets_assigned_agent";
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "fk_tickets_assigned_team";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_assigned_agent_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_assigned_team_id";`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assigned_agent_id";`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assigned_team_id";`);

    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_support_team";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_support_team_id";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "support_team_id";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "support_teams";`);
  }
}

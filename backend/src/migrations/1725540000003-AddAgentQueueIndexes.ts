import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * VS3 — indexes supporting the agent ticket queue query:
 * - tickets.created_at: deterministic ordering + waiting-time scoring input
 * - ai_analyses(ticket_id, created_at DESC): makes the "latest completed
 *   analysis per ticket" subquery an index-only lookup
 *
 * tickets(status) already exists from the initial schema (status filtering).
 * Deliberately NOT indexing columns that are never filtered on directly
 * (spec §15 — no blind indexes).
 */
export class AddAgentQueueIndexes1725540000003 implements MigrationInterface {
  name = 'AddAgentQueueIndexes1725540000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tickets_created_at" ON "tickets" ("created_at");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ai_analyses_ticket_created"
        ON "ai_analyses" ("ticket_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_analyses_ticket_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_created_at";`);
  }
}

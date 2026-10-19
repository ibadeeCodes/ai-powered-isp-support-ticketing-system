import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1725540000001 implements MigrationInterface {
  name = 'CreateUsersTable1725540000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create users_role_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM('CUSTOMER', 'AGENT', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'CUSTOMER',
        "customer_id" UUID,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_users_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
      CREATE INDEX IF NOT EXISTS "idx_users_customer_id" ON "users" ("customer_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
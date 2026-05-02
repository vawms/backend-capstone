import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenFields1766373440327
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refresh_token_hash" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refresh_token_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "session_version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "session_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "refresh_token_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`,
    );
  }
}

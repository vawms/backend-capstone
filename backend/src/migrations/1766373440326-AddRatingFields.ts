import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRatingFields1766373440326 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "rating_score" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "rating_comment" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "rated_at" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "rating_token" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "UQ_service_requests_rating_token" UNIQUE ("rating_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "UQ_service_requests_rating_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "rating_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "rated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "rating_comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "rating_score"`,
    );
  }
}

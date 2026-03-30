import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFollowUpFields1766373440325 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "parent_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD "followup_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_parent_id" FOREIGN KEY ("parent_id") REFERENCES "service_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_requests_parent_id" ON "service_requests" ("parent_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_service_requests_parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_service_requests_parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "followup_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN "parent_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceRequestHistory1766373440328
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."service_request_history_event_type_enum" AS ENUM('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'RESCHEDULED', 'TECHNICIAN_NOTES_UPDATED', 'CLIENT_MEDIA_ADDED', 'TECHNICIAN_MEDIA_ADDED', 'FOLLOW_UP_CREATED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_request_history" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_id" uuid NOT NULL, "service_request_id" uuid NOT NULL, "event_type" "public"."service_request_history_event_type_enum" NOT NULL, "from_status" "public"."service_requests_status_enum", "to_status" "public"."service_requests_status_enum", "technician_id" uuid, "scheduled_date" TIMESTAMP, "summary" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_service_request_history" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_request_history_request_created" ON "service_request_history" ("service_request_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_request_history_company_created" ON "service_request_history" ("company_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_request_history_event_type" ON "service_request_history" ("event_type")`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_request_history" ADD CONSTRAINT "FK_service_request_history_service_request" FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_request_history" ADD CONSTRAINT "FK_service_request_history_technician" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_request_history" DROP CONSTRAINT "FK_service_request_history_technician"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_request_history" DROP CONSTRAINT "FK_service_request_history_service_request"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_request_history_event_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_request_history_company_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_request_history_request_created"`,
    );
    await queryRunner.query(`DROP TABLE "service_request_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."service_request_history_event_type_enum"`,
    );
  }
}

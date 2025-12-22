import { MigrationInterface, QueryRunner } from 'typeorm';

export class Schema1766373440323 implements MigrationInterface {
  name = 'Schema1766373440323';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "technicians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" text NOT NULL, "email" text NOT NULL, "phone" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b14514b23605f79475be53065b3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_requests_channel_enum" AS ENUM('QR', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_requests_type_enum" AS ENUM('MAINTENANCE', 'MALFUNCTION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_requests_status_enum" AS ENUM('PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "client_id" uuid, "channel" "public"."service_requests_channel_enum" NOT NULL, "type" "public"."service_requests_type_enum" NOT NULL, "description" text NOT NULL, "scheduled_date" TIMESTAMP, "technician_notes" text, "client_media" jsonb, "technician_media" jsonb, "status" "public"."service_requests_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "technician_id" uuid, CONSTRAINT "PK_ee60bcd826b7e130bfbd97daf66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_requests_status" ON "service_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_service_requests_company_created" ON "service_requests" ("company_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_clients_email" ON "clients" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_clients_company_id" ON "clients" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "logo_url" character varying, "primary_color" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "name" character varying NOT NULL, "model" character varying NOT NULL, "serial_number" character varying NOT NULL, "location_address" character varying NOT NULL, "location_lat" numeric(10,8) NOT NULL, "location_lng" numeric(11,8) NOT NULL, "qr_token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_83fe7960966d3ff9fdd40b6fa9c" UNIQUE ("qr_token"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assets_company_id" ON "assets" ("company_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assets_qr_token" ON "assets" ("qr_token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "technicians" ADD CONSTRAINT "FK_74d0f81758f5a3ae3c17d0a9ced" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_3ce5a8fc5aa2dafe7d10b7d8bf5" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_c439f276dab8fb3ef30413d220a" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_0f0523ef455e70bfe9a330342cc" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" ADD CONSTRAINT "FK_58f2a97d333d8740ce83c675e41" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_fcadfe25d85cf21251273169128" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets" ADD CONSTRAINT "FK_77e61fc9e3c748b017578d1c6cb" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assets" DROP CONSTRAINT "FK_77e61fc9e3c748b017578d1c6cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_fcadfe25d85cf21251273169128"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_58f2a97d333d8740ce83c675e41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_0f0523ef455e70bfe9a330342cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_c439f276dab8fb3ef30413d220a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP CONSTRAINT "FK_3ce5a8fc5aa2dafe7d10b7d8bf5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "technicians" DROP CONSTRAINT "FK_74d0f81758f5a3ae3c17d0a9ced"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_assets_qr_token"`);
    await queryRunner.query(`DROP INDEX "public"."idx_assets_company_id"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP INDEX "public"."idx_clients_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_clients_email"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_requests_company_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_service_requests_status"`,
    );
    await queryRunner.query(`DROP TABLE "service_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."service_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."service_requests_type_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."service_requests_channel_enum"`,
    );
    await queryRunner.query(`DROP TABLE "technicians"`);
  }
}

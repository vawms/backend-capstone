// Exposes the config values to the rest of the app/backend
import { Injectable } from '@nestjs/common';
import { ConfigSchema } from './config';

// Injectable allows it to be added to other classes (injected)
@Injectable()
export class ConfigService {
  // Runs when class is created, private (only within class), cannot be changed (readonly)
  constructor(private readonly config: ConfigSchema) {}

  // Getter methods that make it so that all config access go through this service
  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get port(): number {
    return this.config.PORT;
  }

  // get s3Endpoint(): string {
  //   return this.config.S3_ENDPOINT;
  // }

  // get s3Bucket(): string {
  //   return this.config.S3_BUCKET;
  // }

  // get s3AccessKey(): string {
  //   return this.config.S3_ACCESS_KEY;
  // }

  // get s3SecretKey(): string {
  //   return this.config.S3_SECRET_KEY;
  // }
  get smtpHost(): string | undefined {
    return this.config.SMTP_HOST;
  }

  get smtpPort(): number | undefined {
    return this.config.SMTP_PORT;
  }

  get smtpUser(): string | undefined {
    return this.config.SMTP_USER;
  }

  get smtpPass(): string | undefined {
    return this.config.SMTP_PASS;
  }

  get smtpFrom(): string | undefined {
    return this.config.SMTP_FROM;
  }

  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }
}

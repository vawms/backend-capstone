import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  // IsUrl,
  validateSync,
} from 'class-validator';

// Defines shape of config
// Decorators (@) are ways to attach metadata to a property
export class ConfigSchema {
  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsNumber()
  PORT: number = 3000;

  // @IsNotEmpty()
  // @IsUrl({ require_tld: false })
  // S3_ENDPOINT!: string;

  // @IsNotEmpty()
  // @IsString()
  // S3_BUCKET!: string;

  // @IsNotEmpty()
  // @IsString()
  // S3_ACCESS_KEY!: string;

  // @IsNotEmpty()
  // @IsString()
  // S3_SECRET_KEY!: string;

  @IsNotEmpty()
  @IsString()
  NODE_ENV: string = 'development';
}

// Takes raw environment variables and converts them into appropriate types and checks with decorators
export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(ConfigSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}

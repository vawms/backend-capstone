import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Asset } from './entities/asset.entity';
import { Client } from './entities/client.entity';
import { Company } from './entities/company.entity';
import { ServiceRequest } from './entities/service-request.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'smart_service',
  synchronize: false, // Always false in production
  logging: true,
  entities: [Asset, Client, Company, ServiceRequest],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
  migrationsTableName: 'migrations',
});

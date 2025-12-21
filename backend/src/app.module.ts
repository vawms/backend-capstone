import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { HealthModule } from './health/health.module';
import { AssetModule } from './modules/assets/asset.module';
import { IntakeModule } from './modules/intake/intake.module';
import { ClientModule } from './modules/clients/client.module';
import { ServiceRequestModule } from './modules/service-request/service-request.module';
import { CompanyModule } from './modules/companies/company.module';
import { TechnicianModule } from './modules/technicians/technician.module';
import { EventsModule } from './events/events.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.databaseUrl,
        autoLoadEntities: true,
        synchronize: false, // Use migrations instead
      }),
    }),
    HealthModule,
    AssetModule,
    ClientModule,
    IntakeModule,
    ServiceRequestModule,
    CompanyModule,
    TechnicianModule,
    EventsModule,
    RealtimeModule,
  ],
})
export class AppModule {}

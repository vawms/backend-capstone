import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from '../../entities/service-request.entity';
import { IntakeService } from './services/intake.service';
import { IntakeController } from './controllers/intake.controller';
import { AssetModule } from '../assets/asset.module';
import { ClientModule } from '../clients/client.module';
import { RateLimiter } from 'src/common/utils/rate-limiter';
import { EventsModule } from '../../events/events.module'; // ADD THIS

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest]),
    AssetModule,
    ClientModule,
    EventsModule,
  ],
  controllers: [IntakeController],
  providers: [IntakeService, RateLimiter],
})
export class IntakeModule {}

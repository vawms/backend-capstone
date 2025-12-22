import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from '../../entities/service-request.entity';
import { ServiceRequestService } from './services/service-request.service';
import { ServiceRequestController } from './controllers/service-request.controller';
import { EventsModule } from '../../events/events.module';
import { TechnicianModule } from '../technicians/technician.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest]),
    EventsModule,
    forwardRef(() => TechnicianModule),
    MailModule,
  ],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}

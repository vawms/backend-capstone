import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from '../../entities/service-request.entity';
import { ServiceRequestService } from './services/service-request.service';
import { ServiceRequestController } from './controllers/service-request.controller';
import { EventsModule } from '../../events/events.module';
import { TechnicianModule } from '../technicians/technician.module';
import { MailModule } from '../mail/mail.module';
import { QrTokenGenerator } from '../../common/utils/qr-token.generator';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest]),
    EventsModule,
    forwardRef(() => TechnicianModule),
    MailModule,
  ],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService, QrTokenGenerator],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from '../../entities/service-request.entity';
import { ServiceRequestHistory } from '../../entities/service-request-history.entity';
import { ServiceRequestService } from './services/service-request.service';
import { ServiceRequestReportService } from './services/service-request-report.service';
import { ServiceRequestController } from './controllers/service-request.controller';
import { EventsModule } from '../../events/events.module';
import { TechnicianModule } from '../technicians/technician.module';
import { MailModule } from '../mail/mail.module';
import { QrTokenGenerator } from '../../common/utils/qr-token.generator';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, ServiceRequestHistory]),
    EventsModule,
    forwardRef(() => TechnicianModule),
    MailModule,
  ],
  controllers: [ServiceRequestController],
  providers: [
    ServiceRequestService,
    ServiceRequestReportService,
    QrTokenGenerator,
  ],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}

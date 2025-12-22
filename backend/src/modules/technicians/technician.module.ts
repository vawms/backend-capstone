import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicianController } from './controllers/technician.controller';
import { TechnicianService } from './services/technician.service';
import { Technician } from '../../entities/technician.entity';
import { Company } from '../../entities/company.entity';
import { ServiceRequestModule } from '../service-request/service-request.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Technician, Company]),
    forwardRef(() => ServiceRequestModule),
  ],
  controllers: [TechnicianController],
  providers: [TechnicianService],
  exports: [TechnicianService],
})
export class TechnicianModule {}

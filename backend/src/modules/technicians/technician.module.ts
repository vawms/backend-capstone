import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicianController } from './controllers/technician.controller';
import { TechnicianService } from './services/technician.service';
import { Technician } from '../../entities/technician.entity';
import { Company } from '../../entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Technician, Company])],
  controllers: [TechnicianController],
  providers: [TechnicianService],
  exports: [TechnicianService],
})
export class TechnicianModule {}

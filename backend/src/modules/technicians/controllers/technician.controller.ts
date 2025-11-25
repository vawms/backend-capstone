import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  // UseGuards,
  Request,
} from '@nestjs/common';
import { TechnicianService } from '../services/technician.service';
// import { Technician } from '../../entities/technician.entity';

@Controller('v1/technicians')
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  @Post()
  create(@Body() createTechnicianDto: any) {
    // In a real app, we would validate DTO and get company_id from auth user
    return this.technicianService.create(createTechnicianDto);
  }

  @Get()
  findAll() {
    // In a real app, filter by company_id from auth user
    // For now, we might need to pass company_id as query param or just list all for demo
    return this.technicianService.findAll();
  }

  @Get('company/:company_id')
  findByCompany(@Param('company_id') companyId: string) {
    return this.technicianService.findByCompany(companyId);
  }
}

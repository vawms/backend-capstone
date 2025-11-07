// src/modules/companies/controllers/company.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  // Query,
  ValidationPipe,
} from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';

@Controller('v1/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(ValidationPipe) dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companyService.create(dto);
  }

  @Get(':id')
  getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CompanyResponseDto> {
    return this.companyService.getById(id);
  }

  @Get()
  list(): Promise<CompanyResponseDto[]> {
    return this.companyService.list();
  }
}

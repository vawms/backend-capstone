// src/modules/companies/services/company.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../../entities/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const entity = this.companyRepo.create({
      name: dto.name,
      logo_url: dto.logo_url,
      primary_color: dto.primary_color,
    });
    const saved = await this.companyRepo.save(entity);
    return this.toDto(saved);
  }

  async getById(id: string): Promise<CompanyResponseDto> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return this.toDto(company);
  }

  async list(): Promise<CompanyResponseDto[]> {
    const companies = await this.companyRepo.find({
      order: { created_at: 'DESC' },
    });
    return companies.map((c) => this.toDto(c));
  }

  private toDto(c: Company): CompanyResponseDto {
    return {
      id: c.id,
      name: c.name,
      logo_url: c.logo_url ?? undefined,
      primary_color: c.primary_color ?? undefined,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }
}

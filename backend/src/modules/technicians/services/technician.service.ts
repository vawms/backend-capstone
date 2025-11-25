import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technician } from '../../../entities/technician.entity';

@Injectable()
export class TechnicianService {
  constructor(
    @InjectRepository(Technician)
    private technicianRepository: Repository<Technician>,
  ) {}

  create(data: Partial<Technician>): Promise<Technician> {
    const technician = this.technicianRepository.create(data);
    return this.technicianRepository.save(technician);
  }

  findAll(): Promise<Technician[]> {
    return this.technicianRepository.find();
  }

  findByCompany(companyId: string): Promise<Technician[]> {
    return this.technicianRepository.find({
      where: { company_id: companyId },
    });
  }

  findOne(id: string): Promise<Technician | null> {
    return this.technicianRepository.findOneBy({ id });
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicianService } from './technician.service';
import { Technician } from '../../../entities/technician.entity';

const mockTechnicianRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('TechnicianService', () => {
  let service: TechnicianService;
  let repository: MockRepository<Technician>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianService,
        {
          provide: getRepositoryToken(Technician),
          useFactory: mockTechnicianRepository,
        },
      ],
    }).compile();

    service = module.get<TechnicianService>(TechnicianService);
    repository = module.get<MockRepository<Technician>>(
      getRepositoryToken(Technician),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a technician', async () => {
      const createDto = {
        name: 'John Doe',
        email: 'john@example.com',
        company_id: 'uuid',
      };
      const savedTechnician = { id: 'uuid', ...createDto };

      repository.create.mockReturnValue(savedTechnician);
      repository.save.mockResolvedValue(savedTechnician);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(savedTechnician);
      expect(result).toEqual(savedTechnician);
    });
  });

  describe('findAll', () => {
    it('should return an array of technicians', async () => {
      const technicians = [{ id: 'uuid', name: 'John Doe' }];
      repository.find.mockResolvedValue(technicians);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(technicians);
    });
  });

  describe('findByCompany', () => {
    it('should return technicians for a specific company', async () => {
      const companyId = 'company-uuid';
      const technicians = [
        { id: 'uuid', name: 'John Doe', company_id: companyId },
      ];
      repository.find.mockResolvedValue(technicians);

      const result = await service.findByCompany(companyId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { company_id: companyId },
      });
      expect(result).toEqual(technicians);
    });
  });

  describe('findOne', () => {
    it('should return a technician by id', async () => {
      const id = 'uuid';
      const technician = { id, name: 'John Doe' };
      repository.findOneBy.mockResolvedValue(technician);

      const result = await service.findOne(id);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id });
      expect(result).toEqual(technician);
    });

    it('should return null if technician not found', async () => {
      const id = 'uuid';
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findOne(id);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id });
      expect(result).toBeNull();
    });
  });
});

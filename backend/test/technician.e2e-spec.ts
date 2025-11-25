import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Repository } from 'typeorm';
import { Technician } from '../src/entities/technician.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('TechnicianController (e2e)', () => {
  let app: INestApplication;
  let technicianRepository: Repository<Technician>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    technicianRepository = moduleFixture.get<Repository<Technician>>(getRepositoryToken(Technician));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/technicians (POST)', () => {
    it('should create a new technician', async () => {
      const createDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0987654321',
        company_id: 'some-company-uuid', // Note: In a real test with DB, this needs to be a valid company ID
      };

      // Mocking the repository save if we don't have a real DB connection or want to isolate
      // But for E2E we usually want real DB. Assuming DB is set up or we mock the service.
      // For this example, we'll assume the app handles the DB connection or fails gracefully if not present.

      return request(app.getHttpServer())
      .post('/technicians')
      .send(createDto)
      .expect(201)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toEqual(createDto.name);
      });
    });
  });

  describe('/technicians (GET)', () => {
    it('should return an array of technicians', () => {
      return request(app.getHttpServer())
        .get('/technicians')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });
});

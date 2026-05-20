import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestChannel,
  ServiceRequestStatus,
  ServiceRequestType,
} from '../../../entities/service-request.entity';
import {
  ServiceRequestHistory,
  ServiceRequestHistoryEventType,
} from '../../../entities/service-request-history.entity';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequestReportService } from './service-request-report.service';
import { EventsGateway } from '../../../events/events.gateway';
import { SseService } from '../../realtime/sse.service';
import { TechnicianService } from '../../technicians/services/technician.service';
import { MailService } from '../../mail/mail.service';
import { QrTokenGenerator } from '../../../common/utils/qr-token.generator';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-token',
}));

const mockServiceRequestRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  query: jest.fn(),
});

const mockHistoryRepository = () => ({
  create: jest.fn((input) => input),
  save: jest.fn(),
});

const mockEventsGateway = () => ({
  emitServiceRequestUpdate: jest.fn(),
});

const mockSseService = () => ({
  emit: jest.fn(),
});

const mockTechnicianService = () => ({
  findOne: jest.fn(),
});

const mockMailService = () => ({
  sendServiceRequestUpdate: jest.fn(),
  sendFollowUpCreated: jest.fn(),
  sendServiceRequestRescheduled: jest.fn(),
  sendServiceRequestCompletionReport: jest.fn(),
});

const mockQrTokenGenerator = () => ({
  generateToken: jest.fn().mockReturnValue('rating-token'),
});

const mockReportService = () => ({
  generateCompletionReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  archiveCompletionReport: jest.fn().mockResolvedValue('/tmp/report.pdf'),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('ServiceRequestService', () => {
  let service: ServiceRequestService;
  let repository: MockRepository<ServiceRequest>;
  let historyRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let eventsGateway: { emitServiceRequestUpdate: jest.Mock };
  let sseService: { emit: jest.Mock };
  let technicianService: { findOne: jest.Mock };
  let mailService: {
    sendServiceRequestUpdate: jest.Mock;
    sendFollowUpCreated: jest.Mock;
    sendServiceRequestRescheduled: jest.Mock;
    sendServiceRequestCompletionReport: jest.Mock;
  };
  let reportService: {
    generateCompletionReport: jest.Mock;
    archiveCompletionReport: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestService,
        {
          provide: getRepositoryToken(ServiceRequest),
          useFactory: mockServiceRequestRepository,
        },
        {
          provide: getRepositoryToken(ServiceRequestHistory),
          useFactory: mockHistoryRepository,
        },
        { provide: EventsGateway, useFactory: mockEventsGateway },
        { provide: SseService, useFactory: mockSseService },
        { provide: TechnicianService, useFactory: mockTechnicianService },
        { provide: MailService, useFactory: mockMailService },
        { provide: QrTokenGenerator, useFactory: mockQrTokenGenerator },
        { provide: ServiceRequestReportService, useFactory: mockReportService },
      ],
    }).compile();

    service = module.get<ServiceRequestService>(ServiceRequestService);
    repository = module.get<MockRepository<ServiceRequest>>(
      getRepositoryToken(ServiceRequest),
    );
    historyRepository = module.get(getRepositoryToken(ServiceRequestHistory));
    eventsGateway = module.get(EventsGateway);
    sseService = module.get(SseService);
    technicianService = module.get(TechnicianService);
    mailService = module.get(MailService);
    reportService = module.get(ServiceRequestReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFollowUp', () => {
    it('creates a follow-up as pending without inherited technician or schedule', async () => {
      const parent = {
        id: 'parent-sr-id',
        company_id: 'company-1',
        asset_id: 'asset-1',
        client_id: 'client-1',
        channel: ServiceRequestChannel.MANUAL,
        type: ServiceRequestType.MAINTENANCE,
        description: 'Parent request',
        status: ServiceRequestStatus.RESOLVED,
        technician_id: 'tech-1',
        scheduled_date: null,
        created_at: new Date('2026-04-01T08:00:00.000Z'),
        updated_at: new Date('2026-04-01T09:00:00.000Z'),
        asset: { id: 'asset-1', company: { name: 'TechCorp' } },
        client: { id: 'client-1', email: 'alice@example.com' },
        technician: { id: 'tech-1', name: 'James' },
      } as unknown as ServiceRequest;

      const created = {
        company_id: parent.company_id,
        asset_id: parent.asset_id,
        client_id: parent.client_id,
        channel: parent.channel,
        type: parent.type,
        description: 'Follow-up visit: replace compressor belt before failure.',
        followup_reason:
          'Compressor belt showing early signs of wear during inspection.',
        parent_id: parent.id,
        technician_id: null,
        status: ServiceRequestStatus.PENDING,
        scheduled_date: null,
      };

      const saved = { id: 'follow-up-id' } as ServiceRequest;
      const fullFollowUp = {
        ...created,
        id: 'follow-up-id',
        created_at: new Date('2026-04-02T10:00:00.000Z'),
        updated_at: new Date('2026-04-02T10:00:00.000Z'),
        client: { id: 'client-1', email: 'alice@example.com' },
      } as unknown as ServiceRequest;

      jest
        .spyOn(service, 'getServiceRequestById')
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(fullFollowUp);
      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(saved);

      const result = await service.createFollowUp(
        parent.id,
        {
          followup_reason:
            'Compressor belt showing early signs of wear during inspection.',
          description:
            'Follow-up visit: replace compressor belt before failure.',
          technician_id: 'tech-override',
          scheduled_date: '2026-04-15T10:00:00.000Z',
        },
        { companyId: parent.company_id },
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          asset_id: 'asset-1',
          client_id: 'client-1',
          channel: ServiceRequestChannel.MANUAL,
          type: ServiceRequestType.MAINTENANCE,
          description:
            'Follow-up visit: replace compressor belt before failure.',
          followup_reason:
            'Compressor belt showing early signs of wear during inspection.',
          parent_id: 'parent-sr-id',
          technician_id: null,
          status: ServiceRequestStatus.PENDING,
          scheduled_date: null,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(technicianService.findOne).not.toHaveBeenCalled();
      expect(eventsGateway.emitServiceRequestUpdate).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          type: 'FOLLOW_UP_CREATED',
          parentId: 'parent-sr-id',
        }),
      );
      expect(sseService.emit).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          event: 'service_request.followup_created',
        }),
      );
      expect(mailService.sendFollowUpCreated).toHaveBeenCalledWith(
        'alice@example.com',
        fullFollowUp,
        parent,
      );
      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          service_request_id: 'follow-up-id',
          event_type: ServiceRequestHistoryEventType.CREATED,
          metadata: { parent_id: 'parent-sr-id' },
        }),
      );
      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          service_request_id: 'parent-sr-id',
          event_type: ServiceRequestHistoryEventType.FOLLOW_UP_CREATED,
          metadata: { follow_up_id: 'follow-up-id' },
        }),
      );
      expect(result).toBe(fullFollowUp);
    });

    it('rejects follow-ups for service requests outside the caller company', async () => {
      const parent = {
        id: 'parent-sr-id',
        company_id: 'company-1',
        status: ServiceRequestStatus.RESOLVED,
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(parent);

      await expect(
        service.createFollowUp(
          parent.id,
          {
            followup_reason: 'Need more work after inspection.',
            description: 'Return on-site to finish the remaining work.',
          },
          { companyId: 'company-2' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('blocks rescheduling when the original service request is already resolved', async () => {
      const resolvedSr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.RESOLVED,
        scheduled_date: new Date('2026-04-10T09:00:00.000Z'),
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: null,
      } as ServiceRequest;

      jest
        .spyOn(service, 'getServiceRequestById')
        .mockResolvedValue(resolvedSr);
      repository.save!.mockResolvedValue(resolvedSr);

      await expect(
        service.update('sr-1', {
          status: ServiceRequestStatus.IN_PROGRESS,
          scheduled_date: '2026-04-11T09:00:00.000Z' as unknown as Date,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records status changes', async () => {
      const sr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.IN_PROGRESS,
        scheduled_date: null,
        technician_id: null,
        technician_notes: null,
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: null,
      } as ServiceRequest;
      const updated = {
        ...sr,
        status: ServiceRequestStatus.RESOLVED,
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(sr);
      repository.save!.mockResolvedValue(updated);

      await service.update('sr-1', { status: ServiceRequestStatus.RESOLVED });

      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          service_request_id: 'sr-1',
          event_type: ServiceRequestHistoryEventType.STATUS_CHANGED,
          from_status: ServiceRequestStatus.IN_PROGRESS,
          to_status: ServiceRequestStatus.RESOLVED,
        }),
      );
    });

    it('does not record status history when status is unchanged', async () => {
      const sr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.IN_PROGRESS,
        scheduled_date: null,
        technician_id: null,
        technician_notes: null,
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: null,
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(sr);
      repository.save!.mockResolvedValue(sr);

      await service.update('sr-1', {
        status: ServiceRequestStatus.IN_PROGRESS,
      });

      expect(historyRepository.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: ServiceRequestHistoryEventType.STATUS_CHANGED,
        }),
      );
    });

    it('sends a completion report when transitioning to resolved', async () => {
      const sr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.IN_PROGRESS,
        scheduled_date: null,
        technician_id: null,
        technician_notes: null,
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: { email: 'alice@example.com' },
      } as ServiceRequest;
      const updated = {
        ...sr,
        status: ServiceRequestStatus.RESOLVED,
        rating_token: 'rating-token',
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(sr);
      repository.save!.mockResolvedValue(updated);

      await service.update('sr-1', { status: ServiceRequestStatus.RESOLVED });

      expect(reportService.generateCompletionReport).toHaveBeenCalledWith(
        'sr-1',
        'company-1',
      );
      expect(
        mailService.sendServiceRequestCompletionReport,
      ).toHaveBeenCalledWith('alice@example.com', updated, Buffer.from('pdf'));
      expect(reportService.archiveCompletionReport).toHaveBeenCalledWith(
        updated,
        Buffer.from('pdf'),
      );
    });

    it('does not resend completion reports for already final requests', async () => {
      const sr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.RESOLVED,
        scheduled_date: null,
        technician_id: null,
        technician_notes: null,
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: { email: 'alice@example.com' },
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(sr);
      repository.save!.mockResolvedValue(sr);

      await service.update('sr-1', { technician_notes: 'Done' });

      expect(reportService.generateCompletionReport).not.toHaveBeenCalled();
      expect(
        mailService.sendServiceRequestCompletionReport,
      ).not.toHaveBeenCalled();
    });

    it('does not fail update when completion report generation fails', async () => {
      const sr = {
        id: 'sr-1',
        company_id: 'company-1',
        status: ServiceRequestStatus.SCHEDULED,
        scheduled_date: null,
        technician_id: null,
        technician_notes: null,
        updated_at: new Date('2026-04-10T09:00:00.000Z'),
        client: { email: 'alice@example.com' },
      } as ServiceRequest;
      const updated = {
        ...sr,
        status: ServiceRequestStatus.CLOSED,
      } as ServiceRequest;

      jest.spyOn(service, 'getServiceRequestById').mockResolvedValue(sr);
      repository.save!.mockResolvedValue(updated);
      reportService.generateCompletionReport.mockRejectedValueOnce(
        new Error('pdf failed'),
      );

      await expect(
        service.update('sr-1', { status: ServiceRequestStatus.CLOSED }),
      ).resolves.toBe(updated);
    });
  });
});

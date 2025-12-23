import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../../../entities/service-request.entity';
import { EventsGateway } from '../../../events/events.gateway';
import { SseService } from '../../realtime/sse.service';
import { TechnicianService } from '../../technicians/services/technician.service';
import { MailService } from '../../mail/mail.service';
import { ListServiceRequestsQuery } from '../dto/list-service-requests.query';
import { ListServiceRequestsResponseDto } from '../dto/list-service-requests-response.dto';
import {
  ServiceRequestCardDto,
  // AssetSummaryDto,
  // ClientSummaryDto,
} from '../dto/service-request-card.dto';
import { UpdateServiceRequestDto } from '../dto/update-service-request.dto';
import { Cursor, CursorData } from '../../../common/utils/cursor';

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    private readonly eventsGateway: EventsGateway,
    private readonly sseService: SseService,
    private readonly technicianService: TechnicianService,
    private readonly mailService: MailService,
  ) {}

  async update(
    id: string,
    dto: UpdateServiceRequestDto,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);

    if (dto.technician_id) {
      const technician = await this.technicianService.findOne(
        dto.technician_id,
      );
      if (!technician) {
        throw new NotFoundException(
          `Technician with ID ${dto.technician_id} not found`,
        );
      }
      sr.technician = technician;
      if (sr.status === ServiceRequestStatus.PENDING) {
        sr.status = ServiceRequestStatus.ASSIGNED;
      }
    }

    if (dto.status) {
      sr.status = dto.status;
    }

    if (dto.technician_notes !== undefined) {
      sr.technician_notes = dto.technician_notes;
    }

    if (dto.scheduled_date !== undefined) {
      sr.scheduled_date = dto.scheduled_date;
    }

    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'UPDATED',
      serviceRequest: updatedSr,
      updatedAt: sr.updated_at,
    });

    this.sseService.emit(sr.company_id, {
      event: 'service_request.updated',
      data: {
        id: sr.id,
        status: sr.status,
        technicianId: sr.technician?.id,
        scheduledDate: sr.scheduled_date,
        updatedAt: sr.updated_at,
      },
    });

    if (updatedSr.client && updatedSr.client.email) {
      await this.mailService.sendServiceRequestUpdate(
        updatedSr.client.email,
        updatedSr,
      );
    }

    return updatedSr;
  }

  async addClientMedia(
    id: string,
    files: Array<{ url: string; kind: 'image' | 'video' | 'document' }>,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);

    const existingMedia = sr.client_media || [];
    sr.client_media = [...existingMedia, ...files];

    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'CLIENT_MEDIA_ADDED',
      serviceRequestId: sr.id,
      client_media: files,
      updatedAt: sr.updated_at,
    });

    return updatedSr;
  }

  async addTechnicianMedia(
    id: string,
    files: Array<{ url: string; kind: 'image' | 'video' | 'document' }>,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);

    const existingMedia = sr.technician_media || [];
    sr.technician_media = [...existingMedia, ...files];

    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'TECHNICIAN_MEDIA_ADDED',
      serviceRequestId: sr.id,
      technician_media: files,
      updatedAt: sr.updated_at,
    });

    return updatedSr;
  }

  /**
   * List service requests with filtering and cursor pagination
   *
   * Query params:
   * - status: filter by status (PENDING, ASSIGNED, etc.)
   * - from: filter from date (2025-11-01)
   * - to: filter to date (2025-11-30)
   * - cursor: pagination cursor from previous response
   * - limit: items per page (default 20, max 100)
   *
   * Returns: items + nextCursor for pagination
   */
  async listServiceRequests(
    query: ListServiceRequestsQuery,
  ): Promise<ListServiceRequestsResponseDto> {
    const { status, from, to, cursor, limit, technicianId } = query;

    // FIX: Ensure limit is a number and set a default if missing
    const takeLimit = limit ? Number(limit) : 20;

    // Decode cursor if provided
    let cursorData: CursorData | null = null;
    if (cursor) {
      cursorData = Cursor.decode(cursor);
      if (!cursorData) {
        throw new Error('Invalid cursor format');
      }
    }

    // Build query
    let qb = this.serviceRequestRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.asset', 'asset')
      .leftJoinAndSelect('asset.company', 'company')
      .leftJoinAndSelect('sr.client', 'client')
      .leftJoinAndSelect('sr.technician', 'technician')
      .orderBy('sr.created_at', 'DESC')
      .addOrderBy('sr.id', 'DESC');

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        qb = qb.where('sr.status IN (:...statuses)', { statuses: status });
      } else {
        qb = qb.where('sr.status = :status', { status });
      }
    }

    // Filter by date range
    if (from) {
      const fromDate = new Date(from);
      qb = qb.andWhere('sr.created_at >= :from', { from: fromDate });
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      qb = qb.andWhere('sr.created_at < :to', { to: toDate });
    }

    // Filter by technician
    if (technicianId) {
      qb = qb.andWhere('sr.technician_id = :technicianId', { technicianId });
    }

    // Apply cursor pagination
    if (cursorData) {
      qb = qb.andWhere(
        '(sr.created_at < :cursorCreatedAt OR (sr.created_at = :cursorCreatedAt AND sr.id < :cursorId))',
        {
          cursorCreatedAt: cursorData.createdAt,
          cursorId: cursorData.id,
        },
      );
    }

    // FIX: Use the parsed takeLimit variable here
    // Fetch limit + 1 (to determine if there are more items)
    const items = await qb.take(takeLimit + 1).getMany();

    // Check if there are more items
    const hasMore = items.length > takeLimit;
    const itemsToReturn = hasMore ? items.slice(0, takeLimit) : items;

    // Build response DTOs
    const dtos = itemsToReturn.map((sr) => this.mapToCardDto(sr));

    // Calculate next cursor
    let nextCursor: string | null = null;
    if (hasMore && dtos.length > 0) {
      const lastItem = itemsToReturn[itemsToReturn.length - 1];
      nextCursor = Cursor.encode({
        createdAt: lastItem.created_at,
        id: lastItem.id,
      });
    }

    return new ListServiceRequestsResponseDto(dtos, nextCursor, dtos.length);
  }

  /**
   * Get full service request details by ID
   */
  async getServiceRequestById(id: string): Promise<ServiceRequest> {
    const sr = await this.serviceRequestRepository.findOne({
      where: { id },
      relations: ['asset', 'asset.company', 'client'],
    });

    if (!sr) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return sr;
  }

  /**
   * Map ServiceRequest entity to card DTO
   */
  private mapToCardDto(sr: ServiceRequest): ServiceRequestCardDto {
    return {
      id: sr.id,
      created_at: sr.created_at,
      type: sr.type,
      status: sr.status,
      description_preview: sr.description.substring(0, 100),
      client_media: sr.client_media,
      technician_media: sr.technician_media,
      asset: {
        id: sr.asset.id,
        name: sr.asset.name,
        model: sr.asset.model,
        company_name: sr.asset.company?.name || 'Unknown',
      },
      client: {
        id: sr.client.id,
        name: sr.client.name,
        email: sr.client.email,
      },
      technician: sr.technician
        ? {
            id: sr.technician.id,
            name: sr.technician.name,
          }
        : undefined,
      technician_notes: sr.technician_notes,
      scheduled_date: sr.scheduled_date || undefined,
    };
  }
}

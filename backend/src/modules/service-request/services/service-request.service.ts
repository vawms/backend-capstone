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
import { ListServiceRequestsQuery } from '../dto/list-service-requests.query';
import { ListServiceRequestsResponseDto } from '../dto/list-service-requests-response.dto';
import {
  ServiceRequestCardDto,
  // AssetSummaryDto,
  // ClientSummaryDto,
} from '../dto/service-request-card.dto';
import { Cursor, CursorData } from '../../../common/utils/cursor';

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    private readonly eventsGateway: EventsGateway,
    private readonly sseService: SseService,
    private readonly technicianService: TechnicianService,
  ) {}

  async updateStatus(
    id: string,
    status: ServiceRequestStatus,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);
    sr.status = status;
    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'STATUS_UPDATED',
      serviceRequestId: sr.id,
      status: sr.status,
      updatedAt: sr.updated_at,
    });

    this.sseService.emit(sr.company_id, {
      event: 'service_request.updated',
      data: {
        id: sr.id,
        status: sr.status,
        updatedAt: sr.updated_at,
      },
    });

    return updatedSr;
  }

  async assignTechnician(
    id: string,
    technicianId: string,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);
    const technician = await this.technicianService.findOne(technicianId);

    if (!technician) {
      throw new NotFoundException(
        `Technician with ID ${technicianId} not found`,
      );
    }

    sr.technician = technician;
    sr.status = ServiceRequestStatus.ASSIGNED; // Auto-update status to ASSIGNED
    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'TECHNICIAN_ASSIGNED',
      serviceRequestId: sr.id,
      technicianId: technician.id,
      technicianName: technician.name,
      status: sr.status,
      updatedAt: sr.updated_at,
    });

    this.sseService.emit(sr.company_id, {
      event: 'service_request.updated',
      data: {
        id: sr.id,
        technicianId: technician.id,
        status: sr.status,
        updatedAt: sr.updated_at,
      },
    });

    return updatedSr;
  }

  async updateTechnicianNotes(
    id: string,
    notes: string,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);

    sr.technician_notes = notes;
    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'TECHNICIAN_NOTES_UPDATED',
      serviceRequestId: sr.id,
      notes: notes,
      updatedAt: sr.updated_at,
    });

    this.sseService.emit(sr.company_id, {
      event: 'service_request.updated',
      data: {
        id: sr.id,
        notes: notes,
        updatedAt: sr.updated_at,
      },
    });

    return updatedSr;
  }

  async addMedia(
    id: string,
    files: Array<{ url: string; kind: 'image' | 'video' | 'document' }>,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);

    const existingMedia = sr.media || [];
    sr.media = [...existingMedia, ...files];

    const updatedSr = await this.serviceRequestRepository.save(sr);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: 'MEDIA_ADDED',
      serviceRequestId: sr.id,
      media: files,
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
      .leftJoinAndSelect('sr.client', 'client')
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
      relations: ['asset', 'client'],
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
      media: sr.media,
      asset: {
        id: sr.asset.id,
        name: sr.asset.name,
        model: sr.asset.model,
      },
      client: {
        id: sr.client.id,
        name: sr.client.name,
        email: sr.client.email,
      },
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../../../entities/service-request.entity';
import {
  ServiceRequestHistory,
  ServiceRequestHistoryEventType,
} from '../../../entities/service-request-history.entity';
import { EventsGateway } from '../../../events/events.gateway';
import { SseService } from '../../realtime/sse.service';
import { TechnicianService } from '../../technicians/services/technician.service';
import { MailService } from '../../mail/mail.service';
import { ListServiceRequestsQuery } from '../dto/list-service-requests.query';
import { ListServiceRequestsResponseDto } from '../dto/list-service-requests-response.dto';
import { ServiceRequestCardDto } from '../dto/service-request-card.dto';
import { CreateFollowUpDto } from '../dto/create-follow-up.dto';
import {
  ServiceRequestChainDto,
  ServiceRequestChainItemDto,
} from '../dto/service-request-chain.dto';
import { UpdateServiceRequestDto } from '../dto/update-service-request.dto';
import { Cursor, CursorData } from '../../../common/utils/cursor';
import { QrTokenGenerator } from '../../../common/utils/qr-token.generator';
import { ServiceRequestReportService } from './service-request-report.service';

interface RecordHistoryInput {
  companyId: string;
  serviceRequestId: string;
  eventType: ServiceRequestHistoryEventType;
  fromStatus?: ServiceRequestStatus | null;
  toStatus?: ServiceRequestStatus | null;
  technicianId?: string | null;
  scheduledDate?: Date | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class ServiceRequestService {
  private readonly logger = new Logger(ServiceRequestService.name);

  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(ServiceRequestHistory)
    private readonly historyRepository: Repository<ServiceRequestHistory>,
    private readonly eventsGateway: EventsGateway,
    private readonly sseService: SseService,
    private readonly technicianService: TechnicianService,
    private readonly mailService: MailService,
    private readonly qrTokenGenerator: QrTokenGenerator,
    private readonly reportService: ServiceRequestReportService,
  ) {}

  async update(
    id: string,
    dto: UpdateServiceRequestDto,
  ): Promise<ServiceRequest> {
    const sr = await this.getServiceRequestById(id);
    const oldScheduledDate = sr.scheduled_date;
    const oldStatus = sr.status;
    const oldTechnicianId = sr.technician_id;
    const oldTechnicianNotes = sr.technician_notes;

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
        sr.status = ServiceRequestStatus.SCHEDULED;
      }
    }

    if (dto.status) {
      sr.status = dto.status;
    }

    // Generate rating token when transitioning to a final status
    if (
      (sr.status === ServiceRequestStatus.RESOLVED ||
        sr.status === ServiceRequestStatus.CLOSED) &&
      !sr.rating_token
    ) {
      sr.rating_token = this.qrTokenGenerator.generateToken();
    }

    if (dto.technician_notes !== undefined) {
      sr.technician_notes = dto.technician_notes;
    }

    if (dto.scheduled_date !== undefined) {
      // Reject rescheduling on finalized statuses
      if (
        oldStatus === ServiceRequestStatus.RESOLVED ||
        oldStatus === ServiceRequestStatus.CLOSED
      ) {
        throw new BadRequestException(
          'Cannot reschedule a service request that is already resolved or closed',
        );
      }
      sr.scheduled_date = dto.scheduled_date;
    }

    if (dto.description !== undefined) {
      sr.description = dto.description;
    }

    const updatedSr = await this.serviceRequestRepository.save(sr);

    await this.recordUpdateHistory(
      updatedSr,
      dto,
      oldStatus,
      oldTechnicianId,
      oldScheduledDate,
      oldTechnicianNotes,
    );

    // Detect rescheduling and emit a specific event
    const wasRescheduled =
      dto.scheduled_date !== undefined &&
      String(oldScheduledDate) !== String(sr.scheduled_date);

    this.eventsGateway.emitServiceRequestUpdate(sr.company_id, {
      type: wasRescheduled ? 'RESCHEDULED' : 'UPDATED',
      serviceRequest: updatedSr,
      updatedAt: sr.updated_at,
    });

    this.sseService.emit(sr.company_id, {
      event: wasRescheduled
        ? 'service_request.rescheduled'
        : 'service_request.updated',
      data: {
        id: sr.id,
        status: sr.status,
        technicianId: sr.technician?.id,
        scheduledDate: sr.scheduled_date,
        ...(wasRescheduled && { previousDate: oldScheduledDate }),
        updatedAt: sr.updated_at,
      },
    });

    if (updatedSr.client && updatedSr.client.email) {
      if (wasRescheduled) {
        await this.mailService.sendServiceRequestRescheduled(
          updatedSr.client.email,
          updatedSr,
          oldScheduledDate,
        );
      } else {
        await this.mailService.sendServiceRequestUpdate(
          updatedSr.client.email,
          updatedSr,
        );
      }

      await this.sendCompletionReportIfNeeded(updatedSr, oldStatus);
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

    await this.recordHistory({
      companyId: sr.company_id,
      serviceRequestId: sr.id,
      eventType: ServiceRequestHistoryEventType.CLIENT_MEDIA_ADDED,
      summary: `Client added ${files.length} media file(s)`,
      metadata: { count: files.length, files },
    });

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

    await this.recordHistory({
      companyId: sr.company_id,
      serviceRequestId: sr.id,
      eventType: ServiceRequestHistoryEventType.TECHNICIAN_MEDIA_ADDED,
      summary: `Technician added ${files.length} media file(s)`,
      metadata: { count: files.length, files },
    });

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
   * - status: filter by status (PENDING, SCHEDULED, etc.)
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
    const {
      status,
      from,
      to,
      cursor,
      limit,
      technicianId,
      parentId,
      rootOnly,
    } = query;

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

    // Filter by parent (follow-ups of a specific SR)
    if (parentId) {
      qb = qb.andWhere('sr.parent_id = :parentId', { parentId });
    }

    // Filter to root-only (no parent = original requests only)
    if (rootOnly === 'true') {
      qb = qb.andWhere('sr.parent_id IS NULL');
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

    // Batch-check which items have follow-ups (single query)
    const itemIds = itemsToReturn.map((sr) => sr.id);
    const childIdMap = new Map<string, string>();
    if (itemIds.length > 0) {
      const followupRows: Array<{ id: string; parent_id: string }> =
        await this.serviceRequestRepository
          .createQueryBuilder('child')
          .select('child.id', 'id')
          .addSelect('child.parent_id', 'parent_id')
          .where('child.parent_id IN (:...ids)', { ids: itemIds })
          .orderBy('child.created_at', 'ASC')
          .addOrderBy('child.id', 'ASC')
          .getRawMany();
      for (const row of followupRows) {
        if (!childIdMap.has(row.parent_id)) {
          childIdMap.set(row.parent_id, row.id);
        }
      }
    }

    // Build response DTOs
    const dtos = itemsToReturn.map((sr) =>
      this.mapToCardDto(sr, childIdMap.get(sr.id)),
    );

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
   * Create a follow-up service request linked to a parent SR
   */
  async createFollowUp(
    parentId: string,
    dto: CreateFollowUpDto,
    user: { companyId: string },
  ): Promise<ServiceRequest> {
    const parent = await this.getServiceRequestById(parentId);

    // Validate company scope
    if (parent.company_id !== user.companyId) {
      throw new NotFoundException(
        `Service request with ID ${parentId} not found`,
      );
    }

    // Only allow follow-ups on IN_PROGRESS or RESOLVED SRs
    const allowedStatuses = [
      ServiceRequestStatus.IN_PROGRESS,
      ServiceRequestStatus.RESOLVED,
    ];
    if (!allowedStatuses.includes(parent.status)) {
      throw new BadRequestException(
        `Cannot create a follow-up for a service request in "${parent.status}" status. ` +
          `Allowed statuses: ${allowedStatuses.join(', ')}`,
      );
    }

    const followUp = this.serviceRequestRepository.create({
      company_id: parent.company_id,
      asset_id: parent.asset_id,
      client_id: parent.client_id,
      channel: parent.channel,
      type: parent.type,
      description: dto.description,
      followup_reason: dto.followup_reason,
      parent_id: parent.id,
      technician_id: null,
      status: ServiceRequestStatus.PENDING,
      scheduled_date: null,
    });

    const saved = await this.serviceRequestRepository.save(followUp);

    // Reload with relations for the response and events
    const fullSr = await this.getServiceRequestById(saved.id);

    await this.recordHistory({
      companyId: fullSr.company_id,
      serviceRequestId: fullSr.id,
      eventType: ServiceRequestHistoryEventType.CREATED,
      toStatus: fullSr.status,
      summary: 'Follow-up service request created',
      metadata: { parent_id: parent.id },
    });
    await this.recordHistory({
      companyId: parent.company_id,
      serviceRequestId: parent.id,
      eventType: ServiceRequestHistoryEventType.FOLLOW_UP_CREATED,
      summary: 'Follow-up service request created',
      metadata: { follow_up_id: fullSr.id },
    });

    // Emit events
    this.eventsGateway.emitServiceRequestUpdate(fullSr.company_id, {
      type: 'FOLLOW_UP_CREATED',
      serviceRequest: fullSr,
      parentId: parent.id,
      createdAt: fullSr.created_at,
    });

    this.sseService.emit(fullSr.company_id, {
      event: 'service_request.followup_created',
      data: {
        id: fullSr.id,
        parentId: parent.id,
        status: fullSr.status,
        createdAt: fullSr.created_at,
      },
    });

    // Email notification
    if (fullSr.client && fullSr.client.email) {
      await this.mailService.sendFollowUpCreated(
        fullSr.client.email,
        fullSr,
        parent,
      );
    }

    return fullSr;
  }

  /**
   * Get the full chain of related service requests (original + all follow-ups)
   */
  async getChain(
    serviceRequestId: string,
    companyId: string,
  ): Promise<ServiceRequestChainDto> {
    // Verify the SR exists and belongs to the company
    const sr = await this.serviceRequestRepository.findOne({
      where: { id: serviceRequestId },
    });

    if (!sr || sr.company_id !== companyId) {
      throw new NotFoundException(
        `Service request with ID ${serviceRequestId} not found`,
      );
    }

    // Walk up to find the root
    let rootId = sr.id;
    let currentParentId = sr.parent_id;
    while (currentParentId) {
      const parent = await this.serviceRequestRepository.findOne({
        where: { id: currentParentId },
        select: ['id', 'parent_id'],
      });
      if (!parent) break;
      rootId = parent.id;
      currentParentId = parent.parent_id;
    }

    // Use a recursive CTE to get the full chain from the root down
    const chainRows: ServiceRequest[] =
      await this.serviceRequestRepository.query(
        `
        WITH RECURSIVE chain AS (
          SELECT sr.* FROM service_requests sr WHERE sr.id = $1 AND sr.company_id = $2
          UNION ALL
          SELECT child.* FROM service_requests child
          INNER JOIN chain c ON child.parent_id = c.id
        )
        SELECT chain.*, t.name AS technician_name, t.id AS tech_id
        FROM chain
        LEFT JOIN technicians t ON chain.technician_id = t.id
        ORDER BY chain.created_at ASC
      `,
        [rootId, companyId],
      );

    const chain: ServiceRequestChainItemDto[] = chainRows.map((row: any) => ({
      id: row.id,
      status: row.status,
      description_preview: row.description
        ? row.description.substring(0, 100)
        : '',
      created_at: row.created_at,
      scheduled_date: row.scheduled_date || undefined,
      followup_reason: row.followup_reason || undefined,
      technician: row.tech_id
        ? { id: row.tech_id, name: row.technician_name }
        : undefined,
    }));

    return {
      original_id: rootId,
      total: chain.length,
      chain,
    };
  }

  /**
   * Get full service request details by ID
   */
  async getServiceRequestById(id: string): Promise<ServiceRequest> {
    const sr = await this.serviceRequestRepository.findOne({
      where: { id },
      relations: ['asset', 'asset.company', 'client', 'technician'],
    });

    if (!sr) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return sr;
  }

  /**
   * Map ServiceRequest entity to card DTO
   */
  private mapToCardDto(
    sr: ServiceRequest,
    childId?: string,
  ): ServiceRequestCardDto {
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
        company_name: sr.asset.company.name,
        location_lng: sr.asset.location_lng,
        location_lat: sr.asset.location_lat,
        location_address: sr.asset.location_address,
        qr_token: sr.asset.qr_token,
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
      parent_id: sr.parent_id || undefined,
      child_id: childId,
      followup_reason: sr.followup_reason || undefined,
      has_followups: Boolean(childId),
      rating_score: sr.rating_score ?? undefined,
    };
  }

  private async recordUpdateHistory(
    sr: ServiceRequest,
    dto: UpdateServiceRequestDto,
    oldStatus: ServiceRequestStatus,
    oldTechnicianId: string | null,
    oldScheduledDate: Date | null,
    oldTechnicianNotes: string | null,
  ): Promise<void> {
    if (dto.status && dto.status !== oldStatus) {
      await this.recordHistory({
        companyId: sr.company_id,
        serviceRequestId: sr.id,
        eventType: ServiceRequestHistoryEventType.STATUS_CHANGED,
        fromStatus: oldStatus,
        toStatus: sr.status,
        summary: `Status changed from ${oldStatus} to ${sr.status}`,
      });
    }

    if (dto.technician_id && dto.technician_id !== oldTechnicianId) {
      await this.recordHistory({
        companyId: sr.company_id,
        serviceRequestId: sr.id,
        eventType: ServiceRequestHistoryEventType.ASSIGNED,
        technicianId: dto.technician_id,
        summary: 'Technician assignment updated',
      });
    }

    if (
      dto.scheduled_date !== undefined &&
      !this.sameDate(oldScheduledDate, sr.scheduled_date)
    ) {
      await this.recordHistory({
        companyId: sr.company_id,
        serviceRequestId: sr.id,
        eventType: ServiceRequestHistoryEventType.RESCHEDULED,
        scheduledDate: sr.scheduled_date,
        summary: 'Service request schedule updated',
        metadata: { previous_scheduled_date: oldScheduledDate },
      });
    }

    if (
      dto.technician_notes !== undefined &&
      dto.technician_notes !== oldTechnicianNotes
    ) {
      await this.recordHistory({
        companyId: sr.company_id,
        serviceRequestId: sr.id,
        eventType: ServiceRequestHistoryEventType.TECHNICIAN_NOTES_UPDATED,
        summary: 'Technician notes updated',
      });
    }
  }

  private async recordHistory(input: RecordHistoryInput): Promise<void> {
    const history = this.historyRepository.create({
      company_id: input.companyId,
      service_request_id: input.serviceRequestId,
      event_type: input.eventType,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      technician_id: input.technicianId ?? null,
      scheduled_date: input.scheduledDate ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? null,
    });

    await this.historyRepository.save(history);
  }

  private async sendCompletionReportIfNeeded(
    sr: ServiceRequest,
    oldStatus: ServiceRequestStatus,
  ): Promise<void> {
    const finalStatuses = [
      ServiceRequestStatus.RESOLVED,
      ServiceRequestStatus.CLOSED,
    ];

    if (
      finalStatuses.includes(oldStatus) ||
      !finalStatuses.includes(sr.status)
    ) {
      return;
    }

    try {
      const pdf = await this.reportService.generateCompletionReport(
        sr.id,
        sr.company_id,
      );
      await this.mailService.sendServiceRequestCompletionReport(
        sr.client.email,
        sr,
        pdf,
      );
      const archivedPath = await this.reportService.archiveCompletionReport(
        sr,
        pdf,
      );
      this.logger.log(
        `Archived completion report for service request ${sr.id}: ${archivedPath}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send completion report for service request ${sr.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private sameDate(left: Date | null, right: Date | null): boolean {
    if (!left && !right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    return new Date(left).getTime() === new Date(right).getTime();
  }
}

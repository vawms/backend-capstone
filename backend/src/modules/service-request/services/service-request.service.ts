import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServiceRequest,
  // ServiceRequestStatus,
} from '../../../entities/service-request.entity';
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
  ) {}

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
    const { status, from, to, cursor, limit } = query;

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
      .orderBy('sr.createdAt', 'DESC')
      .addOrderBy('sr.id', 'DESC'); // Tiebreaker for consistent ordering

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
      qb = qb.andWhere('sr.createdAt >= :from', { from: fromDate });
    }

    if (to) {
      const toDate = new Date(to);
      // Add 1 day to include entire "to" date
      toDate.setDate(toDate.getDate() + 1);
      qb = qb.andWhere('sr.createdAt < :to', { to: toDate });
    }

    // Apply cursor pagination
    if (cursorData) {
      // Cursor pagination: get items BEFORE the cursor
      // Since we're sorting DESC (newest first), we want items with older timestamps
      qb = qb.andWhere(
        '(sr.createdAt < :cursorCreatedAt OR (sr.createdAt = :cursorCreatedAt AND sr.id < :cursorId))',
        {
          cursorCreatedAt: cursorData.createdAt,
          cursorId: cursorData.id,
        },
      );
    }

    // Fetch limit + 1 (to determine if there are more items)
    const items = await qb.take(limit + 1).getMany();

    // Check if there are more items
    const hasMore = items.length > limit;
    const itemsToReturn = hasMore ? items.slice(0, limit) : items;

    // Build response DTOs
    const dtos = itemsToReturn.map((sr) => this.mapToCardDto(sr));

    // Calculate next cursor (from last item in response)
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

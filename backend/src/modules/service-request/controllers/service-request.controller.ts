import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ServiceRequestService } from '../services/service-request.service';
import { ListServiceRequestsQuery } from '../dto/list-service-requests.query';
import { ListServiceRequestsResponseDto } from '../dto/list-service-requests-response.dto';

@Controller('v1/service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  /**
   * GET /v1/service-requests
   *
   * List service requests with filtering and cursor pagination
   *
   * Query params:
   * - status: PENDING, ASSIGNED, SCHEDULED, IN_PROGRESS, RESOLVED, CLOSED (can repeat)
   * - from: 2025-11-01
   * - to: 2025-11-30
   * - cursor: pagination cursor from previous response
   * - limit: 1-100 (default 20)
   *
   * Example:
   * GET /v1/service-requests?status=PENDING&status=ASSIGNED&from=2025-11-01&limit=20
   * GET /v1/service-requests?status=PENDING&cursor=<nextCursor>&limit=20
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listServiceRequests(
    @Query(ValidationPipe) query: ListServiceRequestsQuery,
  ): Promise<ListServiceRequestsResponseDto> {
    return this.serviceRequestService.listServiceRequests(query);
  }

  /**
   * GET /v1/service-requests/:id
   *
   * Get full details of a service request
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getServiceRequest(@Param('id', new ParseUUIDPipe()) id: string) {
    const sr = await this.serviceRequestService.getServiceRequestById(id);

    return {
      id: sr.id,
      created_at: sr.created_at,
      updated_at: sr.updated_at,
      type: sr.type,
      status: sr.status,
      channel: sr.channel,
      description: sr.description,
      media: sr.media,
      asset: {
        id: sr.asset.id,
        name: sr.asset.name,
        model: sr.asset.model,
        serial_number: sr.asset.serial_number,
        location_address: sr.asset.location_address,
        location_lat: sr.asset.location_lat,
        location_lng: sr.asset.location_lng,
      },
      client: {
        id: sr.client.id,
        name: sr.client.name,
        email: sr.client.email,
        phone: sr.client.phone,
      },
    };
  }
}

import {
  Injectable,
  // BadRequestException,
  // NotFoundException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from '../../../entities/service-request.entity';
import {
  ServiceRequestChannel,
  ServiceRequestStatus,
} from '../../../entities/service-request.entity';
import { CreateIntakeRequestDto } from '../dto/create-intake-request.dto';
import { IntakeResponseDto } from '../dto/intake-response.dto';
import { AssetService } from '../../assets/services/asset.service';
import { ClientService } from '../../clients/services/client.service';
import { RateLimiter } from '../../../common/utils/rate-limiter';
import { EventsGateway } from '../../../events/events.gateway';
import { SseService } from '../../realtime/sse.service';

@Injectable()
export class IntakeService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    private readonly assetService: AssetService,
    private readonly clientService: ClientService,
    private readonly rateLimiter: RateLimiter,
    private readonly sseService: SseService,
    private readonly eventsGateway: EventsGateway,
  ) { }

  /**
   * Create service request from QR intake form
   *
   * Flow:
   * 1. Validate rate limit
   * 2. Resolve QR token to asset + company
   * 3. Find or create client
   * 4. Create service request
   * 5. Return response
   */
  async createIntakeRequest(
    qr_token: string,
    ip: string,
    dto: CreateIntakeRequestDto,
  ): Promise<IntakeResponseDto> {
    // Rate limit: 5 requests per token per IP per hour
    const rateLimitKey = `intake:${qr_token}:${ip}`;
    if (!this.rateLimiter.isAllowed(rateLimitKey)) {
      throw new HttpException(
        'Too many requests for this QR code. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Resolve QR token to asset
    // const asset = await this.assetService.resolveByQrToken(qrToken);

    // Get full asset entity to access companyId
    const assetEntity = await this.getAssetEntity(qr_token);

    // Find or create client
    const client = await this.clientService.findOrCreateClient({
      company_id: assetEntity.company_id,
      name: dto.contact.name,
      email: dto.contact.email,
      phone: dto.contact.phone,
    });

    // Create service request
    const serviceRequest = this.serviceRequestRepository.create({
      company_id: assetEntity.company_id,
      asset_id: assetEntity.id,
      client_id: client.id,
      channel: ServiceRequestChannel.QR,
      type: dto.type,
      description: dto.description,
      media: dto.media || [],
      status: ServiceRequestStatus.PENDING,
    });

    const saved = await this.serviceRequestRepository.save(serviceRequest);

    this.sseService.emit(saved.company_id, {
      event: 'service_request.created',
      data: {
        id: saved.id,
        createdAt: saved.created_at,
        status: saved.status,
        type: saved.type,
        description: saved.description,
      },
    });

    this.eventsGateway.emitServiceRequestUpdate(saved.company_id, {
      type: 'SERVICE_REQUEST_CREATED',
      id: saved.id,
      status: saved.status,
      createdAt: saved.created_at,
    });

    return new IntakeResponseDto(saved.id, saved.created_at);
  }

  /**
   * Helper: Get full asset entity (not just public DTO)
   * Used internally to get companyId
   */
  private async getAssetEntity(qr_token: string) {
    // This would normally be in AssetService
    // For now, we'll call the service method directly
    // In production, add a private method to AssetService
    return await this.assetService.getAssetEntityByQrToken(qr_token);
  }

  /**
   * Get rate limit status for a token
   * (useful for frontend to show remaining attempts)
   */
  getRateLimitStatus(qr_token: string, ip: string) {
    const rateLimitKey = `intake:${qr_token}:${ip}`;
    const remaining = this.rateLimiter.getRemaining(rateLimitKey);
    return {
      remaining,
      resetIn: '1 hour',
    };
  }
}

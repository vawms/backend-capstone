import {
  Post,
  UseInterceptors,
  UploadedFiles,
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ServiceRequestService } from '../services/service-request.service';
import { ListServiceRequestsQuery } from '../dto/list-service-requests.query';
import { ListServiceRequestsResponseDto } from '../dto/list-service-requests-response.dto';
import { UpdateServiceRequestDto } from '../dto/update-service-request.dto';

@Controller('v1/service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(ValidationPipe) dto: UpdateServiceRequestDto,
  ) {
    return this.serviceRequestService.update(id, dto);
  }

  @Post(':id/client-media')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const mediaFiles = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      kind: 'image' as const, // Defaulting to image for now
    }));
    return await this.serviceRequestService.addClientMedia(id, mediaFiles);
  }

  @Post(':id/technician-media')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadTechnicianMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const mediaFiles = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      kind: 'image' as const, // Defaulting to image for now
    }));
    return await this.serviceRequestService.addTechnicianMedia(id, mediaFiles);
  }

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
      client_media: sr.client_media,
      technician_media: sr.technician_media,
      asset: {
        id: sr.asset.id,
        name: sr.asset.name,
        model: sr.asset.model,
        serial_number: sr.asset.serial_number,
        location_address: sr.asset.location_address,
        location_lat: sr.asset.location_lat,
        location_lng: sr.asset.location_lng,
        company_name: sr.asset.company.name,
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

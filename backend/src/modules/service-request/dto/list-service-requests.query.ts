import {
  IsOptional,
  IsEnum,
  IsISO8601,
  IsString,
  IsNumber,
  IsUUID,
  IsBooleanString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceRequestStatus } from '../../../entities/service-request.entity';

/**
 * Query parameters for listing service requests
 */
export class ListServiceRequestsQuery {
  /**
   * Filter by status(es)
   * Can be single: ?status=PENDING
   * Or multiple: ?status=PENDING&status=ASSIGNED
   */
  @IsOptional()
  @IsEnum(ServiceRequestStatus, { each: true })
  @Type(() => String)
  status?: ServiceRequestStatus | ServiceRequestStatus[];

  /**
   * Filter from date (inclusive)
   * ISO 8601 format: 2025-11-01
   */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /**
   * Filter to date (inclusive)
   * ISO 8601 format: 2025-11-30
   */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /**
   * Pagination cursor
   * Format: base64(createdAt:id)
   * Returned as `nextCursor` from previous response
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  /**
   * Items per page
   * Default: 20, Max: 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /**
   * Filter by technician ID
   */
  @IsOptional()
  @IsString()
  technicianId?: string;

  /**
   * Filter to show only follow-ups of a given service request
   */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  /**
   * Set to "true" to show only root service requests (no parent)
   */
  @IsOptional()
  @IsBooleanString()
  rootOnly?: string;
}

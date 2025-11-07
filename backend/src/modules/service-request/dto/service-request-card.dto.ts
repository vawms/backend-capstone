import {
  ServiceRequestType,
  ServiceRequestStatus,
} from '../../../entities/service-request.entity';

/**
 * Minimal asset summary for list view
 */
export class AssetSummaryDto {
  id!: string;
  name!: string;
  model!: string;
}

/**
 * Minimal client summary for list view
 */
export class ClientSummaryDto {
  id!: string;
  name!: string;
  email!: string;
}

/**
 * Service request card (used in list responses)
 * Minimal data; client fetches full details by calling GET /v1/service-requests/:id
 */
export class ServiceRequestCardDto {
  id!: string;
  created_at!: Date;
  type!: ServiceRequestType;
  status!: ServiceRequestStatus;
  description_preview!: string; // First 100 chars of description
  asset!: AssetSummaryDto;
  client!: ClientSummaryDto;
}

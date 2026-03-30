import { ServiceRequestStatus } from '../../../entities/service-request.entity';

export class ServiceRequestChainItemDto {
  id!: string;
  status!: ServiceRequestStatus;
  description_preview!: string;
  created_at!: Date;
  scheduled_date?: Date;
  followup_reason?: string;
  technician?: { id: string; name: string };
}

export class ServiceRequestChainDto {
  /** The root (original) service request ID */
  original_id!: string;

  /** Total number of items in the chain */
  total!: number;

  /** Ordered oldest → newest */
  chain!: ServiceRequestChainItemDto[];
}

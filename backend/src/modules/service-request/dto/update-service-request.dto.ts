import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ServiceRequestStatus } from '../../../entities/service-request.entity';

export class UpdateServiceRequestDto {
  @IsEnum(ServiceRequestStatus)
  @IsOptional()
  status?: ServiceRequestStatus;

  @IsUUID()
  @IsOptional()
  technician_id?: string;

  @IsString()
  @IsOptional()
  technician_notes?: string;

  @IsDateString()
  @IsOptional()
  scheduled_date?: Date;

  @IsString()
  @IsOptional()
  description?: string;
}

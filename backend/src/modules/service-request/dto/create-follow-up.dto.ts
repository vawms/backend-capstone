import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateFollowUpDto {
  /**
   * Why the follow-up is needed
   * e.g. "Parts not available on site", "Additional work required"
   */
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  followup_reason!: string;

  /**
   * Description for the new service request
   */
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  /**
   * Optionally assign a technician (defaults to parent's technician)
   */
  @IsUUID()
  @IsOptional()
  technician_id?: string;

  /**
   * Optionally pre-schedule the follow-up visit
   */
  @IsDateString()
  @IsOptional()
  scheduled_date?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  @IsNotEmpty()
  company_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsString()
  @IsNotEmpty()
  serial_number!: string;

  @IsString()
  @IsNotEmpty()
  location_address!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  location_lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  location_lng!: number;
}

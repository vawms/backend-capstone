export class AssetResponseDto {
  id!: string;
  company_id!: string;
  name!: string;
  model!: string;
  serial_number!: string;
  location_address!: string;
  location_lat!: number;
  location_lng!: number;
  qr_token!: string;
  created_at!: Date;
}

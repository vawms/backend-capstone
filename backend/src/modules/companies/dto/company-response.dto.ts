// src/modules/companies/dto/company-response.dto.ts
export class CompanyResponseDto {
  id!: string;
  name!: string;
  logo_url?: string;
  primary_color?: string;
  created_at!: Date;
  updated_at!: Date;
}

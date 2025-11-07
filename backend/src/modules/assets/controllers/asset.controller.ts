import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssetService } from '../services/asset.service';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { PublicAssetDto } from '../dto/public-asset.dto';

@Controller('v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * POST /v1/assets
   * Create a new asset with auto-generated QR token
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAsset(
    @Body(ValidationPipe) dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetService.createAsset(dto);
  }

  /**
   * GET /v1/assets/:id
   * Fetch asset by ID
   */
  @Get(':id')
  async getAsset(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AssetResponseDto> {
    return this.assetService.getAssetById(id);
  }

  /**
   * POST /v1/assets/:id/qr
   * Get QR token and intake URL for asset
   */
  @Post(':id/qr')
  async getQrToken(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ qr_token: string; intakeUrl: string }> {
    return this.assetService.getQrToken(id);
  }
}

/**
 * Public controller (no authentication required)
 */
@Controller('v1/public/qr')
export class PublicQrController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * GET /v1/public/qr/asset/:token
   * Resolve QR token to asset (limited public data)
   */
  @Get('asset/:token')
  async resolveQrToken(@Param('token') token: string): Promise<PublicAssetDto> {
    return this.assetService.resolveByQrToken(token);
  }
}

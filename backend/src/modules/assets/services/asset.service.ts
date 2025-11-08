import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../../../entities/asset.entity';
import { QrTokenGenerator } from '../../../common/utils/qr-token.generator';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import { PublicAssetDto } from '../dto/public-asset.dto';
import { isDatabaseError } from 'src/common/utils/database-error.guard';

@Injectable()
export class AssetService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly qrTokenGenerator: QrTokenGenerator,
  ) {}

  /**
   * Create a new asset
   * Generates a unique QR token; handles collisions by retrying
   */
  async createAsset(dto: CreateAssetDto): Promise<AssetResponseDto> {
    let qr_token = this.qrTokenGenerator.generateToken();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const asset = this.assetRepository.create({
          ...dto,
          qr_token,
        });

        const saved = await this.assetRepository.save(asset);
        return this.mapToResponseDto(saved);
      } catch (error) {
        // Type guard: safely narrows error to known structure
        if (isDatabaseError(error) && error.code === '23505') {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new ConflictException(
              'Failed to generate unique QR token after retries',
            );
          }
          qr_token = this.qrTokenGenerator.generateToken();
        } else {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Failed to generate unique QR token after retries',
    );
  }

  /**
   * Fetch asset by ID
   */
  async getAssetById(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({ where: { id }, relations:['company'] });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return this.mapToResponseDto(asset);
  }

  /**
   * Resolve asset by QR token (public endpoint)
   * Returns limited public data
   */
  async resolveByQrToken(qr_token: string): Promise<PublicAssetDto> {
    // Validate token format first (fast check before DB query)
    if (!this.qrTokenGenerator.isValidToken(qr_token)) {
      throw new NotFoundException('Invalid QR token format');
    }

    const asset = await this.assetRepository.findOne({
      where: { qr_token },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return new PublicAssetDto(asset);
  }

  /**
   * Get QR token for asset (for generating QR code URLs)
   */
  async getQrToken(
    assetId: string,
  ): Promise<{ qr_token: string; intakeUrl: string }> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    return {
      qr_token: asset.qr_token,
      intakeUrl: `https://alejandro-adorno-manchini.com/i/${asset.qr_token}`,
    };
  }

  /**
   * Internal method: get full asset entity by QR token
   * Used by other services (not exposed via API)
   */
  async getAssetEntityByQrToken(qr_token: string) {
    // Validate token format
    if (!this.qrTokenGenerator.isValidToken(qr_token)) {
      throw new NotFoundException('Invalid QR token format');
    }

    const asset = await this.assetRepository.findOne({
      where: { qr_token },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private mapToResponseDto(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      company_id: asset.company_id,
      company_name: asset.company?.name ?? '',
      name: asset.name,
      model: asset.model,
      serial_number: asset.serial_number,
      location_address: asset.location_address,
      location_lat: asset.location_lat,
      location_lng: asset.location_lng,
      qr_token: asset.qr_token,
      created_at: asset.created_at,
    };
  }
}

import { Asset } from '../../../entities/asset.entity';

export class PublicAssetDto {
  id: string;
  name: string;
  model: string;
  location: {
    city: string;
    lat: number;
    lng: number;
  };

  constructor(asset: Asset) {
    this.id = asset.id;
    this.name = asset.name;
    this.model = asset.model;
    this.location = {
      city: this.extractCity(asset.location_address),
      lat: asset.location_lat,
      lng: asset.location_lng,
    };
  }

  private extractCity(address: string): string {
    // Simple extraction: take last part after comma
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  }
}

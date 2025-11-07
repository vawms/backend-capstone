import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../../entities/asset.entity';
import { Company } from '../../entities/company.entity';
import { Client } from 'src/entities/client.entity';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { AssetService } from './services/asset.service';
import { AssetController } from './controllers/asset.controller';
import { PublicQrController } from './controllers/asset.controller';
import { QrTokenGenerator } from '../../common/utils/qr-token.generator';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Company, Client, ServiceRequest])],
  controllers: [AssetController, PublicQrController],
  providers: [AssetService, QrTokenGenerator],
  exports: [AssetService],
})
export class AssetModule {}

// Bundles the service and the controller together as any module
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  // Handles `/health` requests
  controllers: [HealthController],
  // Creates instance of this service and makes it injectable
  providers: [HealthService],
})
export class HealthModule {}

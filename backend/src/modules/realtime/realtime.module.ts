import { Module, Global } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { SseService } from './sse.service';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [SseService],
  exports: [SseService],
})
export class RealtimeModule {}

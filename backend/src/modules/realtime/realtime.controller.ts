import { Controller, Get, Sse, MessageEvent, UseGuards, Request } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(private readonly sseService: SseService) {}

  @Sse('stream')
  stream(@Request() req: any): Observable<MessageEvent> {
    const companyId = req.user.companyId;
    return this.sseService.stream(companyId);
  }
}

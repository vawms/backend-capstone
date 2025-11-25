import { Controller, Get, Sse, MessageEvent, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('v1/realtime')
export class RealtimeController {
    constructor(private readonly sseService: SseService) { }

    @Sse('stream')
    stream(@Query('companyId') companyId: string): Observable<MessageEvent> {
        // In a real app, companyId would come from the authenticated user
        return this.sseService.stream(companyId);
    }
}

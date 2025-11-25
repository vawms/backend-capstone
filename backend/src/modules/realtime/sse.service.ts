import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class SseService {
    private eventSubject = new Subject<{ companyId: string; data: any }>();

    emit(companyId: string, data: any) {
        this.eventSubject.next({ companyId, data });
    }

    stream(companyId: string): Observable<MessageEvent> {
        return this.eventSubject.asObservable().pipe(
            filter((event) => event.companyId === companyId),
            map((event) => ({
                data: event.data,
            })),
        );
    }
}

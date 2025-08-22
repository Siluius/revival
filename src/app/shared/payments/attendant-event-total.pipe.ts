import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { PaymentsService } from './payments.service';

@Pipe({ name: 'attendantEventTotal', standalone: true })
export class AttendantEventTotalPipe implements PipeTransform {
  constructor(private readonly payments: PaymentsService) {}
  transform(attendantId: string, eventId: string): Observable<number> {
    return this.payments.getCounter$(attendantId, eventId);
  }
}
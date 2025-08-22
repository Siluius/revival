import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, DocumentData, CollectionReference } from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';

export type EventStatus = 'proposal' | 'scheduled' | 'executed';

export interface AppEvent {
  id: string;
  name: string;
  description: string;
  status: EventStatus;
  start: Date;
  end: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AppEventInput = {
  name: string;
  description: string;
  status: EventStatus;
  start: Date;
  end: Date;
};

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef: CollectionReference<DocumentData> = collection(this.firestore, 'events');

  private toDate(value: any): Date {
    if (value instanceof Date) return value;
    if (value && typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
  }

  private toAppEvent(data: any, id: string): AppEvent {
    return {
      id,
      name: data.name ?? '',
      description: data.description ?? '',
      status: data.status as EventStatus,
      start: this.toDate(data.start),
      end: this.toDate(data.end),
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt)
    };
  }

  streamAll$(): Observable<AppEvent[]> {
    return collectionData(this.collectionRef, { idField: 'id' }).pipe(
      map((rows: any[]) => rows.map(row => this.toAppEvent(row, row.id)))
    );
  }

  async create(input: AppEventInput): Promise<string> {
    const now = new Date();
    const payload = {
      name: input.name,
      description: input.description,
      status: input.status,
      start: input.start,
      end: input.end,
      createdAt: now,
      updatedAt: now
    };
    const ref = await addDoc(this.collectionRef, payload);
    return ref.id;
  }

  async update(id: string, patch: Partial<AppEventInput>): Promise<void> {
    const ref = doc(this.firestore, `events/${id}`);
    const payload = { ...patch, updatedAt: new Date() } as Record<string, any>;
    await updateDoc(ref, payload);
  }
}
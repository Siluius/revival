import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AppEvent, NewAppEvent } from './events.interfaces';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'events');

  getAll$(): Observable<AppEvent[]> {
    const q = query(this.collectionRef, orderBy('name'));
    return collectionData(q, { idField: 'id' }) as Observable<AppEvent[]>;
  }

  getById$(id: string): Observable<AppEvent | null> {
    const ref = doc(this.firestore, `events/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as AppEvent) ?? null));
  }

  async create(data: NewAppEvent): Promise<string> {
    const result = await addDoc(this.collectionRef, {
      name: data.name,
      description: data.description ?? null,
      costUSD: data.costUSD ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return result.id;
  }

  async update(id: string, data: Partial<NewAppEvent>): Promise<void> {
    const ref = doc(this.firestore, `events/${id}`);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}
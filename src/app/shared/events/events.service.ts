import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AppEvent, NewAppEvent } from './events.interfaces';
import { ActivitiesService } from '../activities/activities.service';
import { Auth } from '@angular/fire/auth';
import { CompanyService } from '../company/company.service';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'events');
  private readonly activities = inject(ActivitiesService);
  private readonly auth = inject(Auth);
  private readonly company = inject(CompanyService);

  getAll$(): Observable<AppEvent[]> {
    const companyId = this.company.selectedCompanyId();
    const q = companyId ? query(this.collectionRef, where('companyId', '==', companyId), orderBy('name')) : query(this.collectionRef, orderBy('name'));
    return collectionData(q, { idField: 'id' }) as Observable<AppEvent[]>;
  }

  getById$(id: string): Observable<AppEvent | null> {
    const ref = doc(this.firestore, `events/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as AppEvent) ?? null));
  }

  async create(data: NewAppEvent): Promise<string> {
    const result = await addDoc(this.collectionRef, {
      companyId: this.company.selectedCompanyId(),
      name: data.name,
      description: data.description ?? null,
      costUSD: data.costUSD ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const user = this.auth.currentUser;
    await this.activities.logEntity('events', 'create', 'events', result.id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { data });
    return result.id;
  }

  async update(id: string, data: Partial<NewAppEvent>): Promise<void> {
    const ref = doc(this.firestore, `events/${id}`);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const user = this.auth.currentUser;
    await this.activities.logEntity('events', 'update', 'events', id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { data });
  }
}
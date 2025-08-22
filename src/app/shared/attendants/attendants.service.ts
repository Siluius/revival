import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Attendant, NewAttendant } from './attendants.interfaces';
import { ActivitiesService } from '../activities/activities.service';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AttendantsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'attendants');
  private readonly activities = inject(ActivitiesService);
  private readonly auth = inject(Auth);

  getAll$(): Observable<Attendant[]> {
    const q = query(this.collectionRef, orderBy('lastName'), orderBy('firstName'));
    return collectionData(q, { idField: 'id' }) as Observable<Attendant[]>;
  }

  getById$(id: string): Observable<Attendant | null> {
    const ref = doc(this.firestore, `attendants/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Attendant) ?? null));
  }

  async create(data: NewAttendant): Promise<string> {
    const result = await addDoc(this.collectionRef, {
      ...data,
      paymentStatus: 'unpaid',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const user = this.auth.currentUser;
    await this.activities.logEntity('attendants', 'create', 'attendants', result.id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { data });
    return result.id;
  }

  async update(id: string, data: Partial<NewAttendant>): Promise<void> {
    const ref = doc(this.firestore, `attendants/${id}`);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const user = this.auth.currentUser;
    await this.activities.logEntity('attendants', 'update', 'attendants', id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { data });
  }
}

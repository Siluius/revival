import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Attendant, NewAttendant } from './attendants.interfaces';

@Injectable({ providedIn: 'root' })
export class AttendantsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'attendants');

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
    return result.id;
  }

  async update(id: string, data: Partial<NewAttendant>): Promise<void> {
    const ref = doc(this.firestore, `attendants/${id}`);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}

import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Attendant, NewAttendant } from './attendants.interfaces';
import { CompanyService } from '../company/company.service';

@Injectable({ providedIn: 'root' })
export class AttendantsService {
  private readonly firestore = inject(Firestore);
  private readonly company = inject(CompanyService);
  private readonly collectionRef = collection(this.firestore, 'attendants');

  getAll$(): Observable<Attendant[]> {
    const companyId = this.company.selectedCompanyId();
    const q = companyId ? query(this.collectionRef, where('companyId', '==', companyId), orderBy('lastName'), orderBy('firstName')) : query(this.collectionRef, orderBy('lastName'), orderBy('firstName'));
    return collectionData(q, { idField: 'id' }) as Observable<Attendant[]>;
  }

  getById$(id: string): Observable<Attendant | null> {
    const ref = doc(this.firestore, `attendants/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Attendant) ?? null));
  }

  async create(data: NewAttendant): Promise<string> {
    const result = await addDoc(this.collectionRef, {
      ...data,
      companyId: this.company.selectedCompanyId(),
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

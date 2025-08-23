import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Organization, NewOrganization } from './organizations.interfaces';
import { CompanyService } from '../company/company.service';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly firestore = inject(Firestore);
  private readonly company = inject(CompanyService);
  private readonly collectionRef = collection(this.firestore, 'organizations');

  getAll$(): Observable<Organization[]> {
    const companyId = this.company.selectedCompanyId();
    const q = companyId ? query(this.collectionRef, where('companyId', '==', companyId), orderBy('name')) : query(this.collectionRef, orderBy('name'));
    return collectionData(q, { idField: 'id' }) as Observable<Organization[]>;
  }

  getById$(id: string): Observable<Organization | null> {
    const ref = doc(this.firestore, `organizations/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Organization) ?? null));
  }

  async create(data: NewOrganization): Promise<string> {
    const result = await addDoc(this.collectionRef, {
      companyId: this.company.selectedCompanyId(),
      name: data.name,
      description: data.description ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return result.id;
  }

  async update(id: string, data: Partial<NewOrganization>): Promise<void> {
    const ref = doc(this.firestore, `organizations/${id}`);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
}

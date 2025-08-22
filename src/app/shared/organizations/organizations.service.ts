import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Organization, NewOrganization } from './organizations.interfaces';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'organizations');

  getAll$(): Observable<Organization[]> {
    const q = query(this.collectionRef, orderBy('name'));
    return collectionData(q, { idField: 'id' }) as Observable<Organization[]>;
  }

  getById$(id: string): Observable<Organization | null> {
    const ref = doc(this.firestore, `organizations/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Organization) ?? null));
  }

  async create(data: NewOrganization): Promise<string> {
    const result = await addDoc(this.collectionRef, {
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
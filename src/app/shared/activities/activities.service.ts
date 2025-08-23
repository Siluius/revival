import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, orderBy, query, serverTimestamp, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ActivityAction, ActivityModule, ActivityRecord, NewActivityRecord } from './activities.interfaces';
import { CompanyService } from '../company/company.service';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'activities');
  private readonly company = inject(CompanyService);

  async log(record: NewActivityRecord): Promise<void> {
    await addDoc(this.collectionRef, { companyId: this.company.selectedCompanyId(), ...record, createdAt: serverTimestamp() });
  }

  getAll$(): Observable<ActivityRecord[]> {
    const companyId = this.company.selectedCompanyId();
    const q = companyId ? query(this.collectionRef, where('companyId', '==', companyId), orderBy('createdAt', 'desc')) : query(this.collectionRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<ActivityRecord[]>;
  }

  getFiltered$(opts: { module?: ActivityModule | 'all'; userId?: string | 'all'; search?: string }): Observable<ActivityRecord[]> {
    const whereClauses: any[] = [];
    const companyId = this.company.selectedCompanyId();
    if (companyId) whereClauses.push(where('companyId', '==', companyId));
    if (opts.module && opts.module !== 'all') whereClauses.push(where('module', '==', opts.module));
    if (opts.userId && opts.userId !== 'all') whereClauses.push(where('userId', '==', opts.userId));
    const q = whereClauses.length ? query(this.collectionRef, ...whereClauses, orderBy('createdAt', 'desc')) : query(this.collectionRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<ActivityRecord[]>;
  }

  // Convenience helpers
  async logAuth(action: 'login' | 'logout', user: { uid: string; email: string | null; displayName: string | null }): Promise<void> {
    await this.log({ module: 'auth', action, userId: user.uid, userEmail: user.email, userDisplayName: user.displayName });
  }

  async logEntity(module: ActivityModule, action: ActivityAction, entityCollection: string, entityId: string, user?: { uid?: string | null; email?: string | null; displayName?: string | null }, details?: unknown): Promise<void> {
    await this.log({ module, action, entityCollection, entityId, userId: user?.uid ?? null, userEmail: user?.email ?? null, userDisplayName: user?.displayName ?? null, details: details ?? null });
  }
}
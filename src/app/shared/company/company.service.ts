import { Injectable, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, addDoc, collection, collectionData, query, serverTimestamp, where, getDocs } from '@angular/fire/firestore';
import { map, Observable, switchMap, of } from 'rxjs';
import { Company, CompanyMembership } from './company.interfaces';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  readonly selectedCompanyId = signal<string | null>(localStorage.getItem('companyId') || null);

  setSelectedCompanyId(id: string | null): void {
    this.selectedCompanyId.set(id);
    if (id) localStorage.setItem('companyId', id); else localStorage.removeItem('companyId');
  }

  getMyCompanies$(): Observable<Company[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return of([] as Company[]);
    const membershipsQ = query(collection(this.firestore, 'companyMemberships'), where('userId', '==', uid));
    return collectionData(membershipsQ, { idField: 'id' }).pipe(
      map((ms: any[]) => ms.map(m => m.companyId)),
      switchMap(companyIds => companyIds.length ? collectionData(query(collection(this.firestore, 'companies'), where('__name__', 'in', companyIds)), { idField: 'id' }) as Observable<Company[]> : of([] as Company[]))
    );
  }

  getMembershipFor$(companyId: string, userId: string): Observable<CompanyMembership | null> {
    const q = query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }).pipe(map((rows: any[]) => rows[0] ?? null)) as any;
  }

  getMyMembership$(companyId: string): Observable<CompanyMembership | null> {
    return this.authService.authState$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const q = query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', user.uid));
        return collectionData(q, { idField: 'id' }).pipe(map((rows: any[]) => rows[0] ?? null));
      })
    );
  }

  async createCompany(name: string): Promise<string> {
    const uid = this.auth.currentUser?.uid as string;
    await this.ensureNameUnique(name);
    const ref = await addDoc(collection(this.firestore, 'companies'), { name, createdBy: uid, createdAt: serverTimestamp() });
    await addDoc(collection(this.firestore, 'companyMemberships'), { companyId: ref.id, userId: uid, role: 'admin', createdAt: serverTimestamp() });
    this.setSelectedCompanyId(ref.id);
    return ref.id;
  }

  async joinCompanyByName(name: string): Promise<void> {
    const uid = this.auth.currentUser?.uid as string;
    const q = query(collection(this.firestore, 'companies'), where('name', '==', name));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Company not found');
    const companyId = snap.docs[0].id;
    const exists = await getDocs(query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', uid)));
    if (exists.empty) {
      await addDoc(collection(this.firestore, 'companyMemberships'), { companyId, userId: uid, role: 'viewer', createdAt: serverTimestamp() });
    }
    this.setSelectedCompanyId(companyId);
  }

  async ensureNameUnique(name: string): Promise<void> {
    const q = query(collection(this.firestore, 'companies'), where('name', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error('Company name already exists');
  }
}
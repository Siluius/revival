import { Injectable, inject, signal } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, addDoc, collection, collectionData, query, serverTimestamp, where, getDocs, updateDoc, doc, getDoc } from '@angular/fire/firestore';
import { map, Observable, switchMap, of } from 'rxjs';
import { Company, CompanyMembership } from './company.interfaces';

export interface CompanyInvite {
  id: string;
  companyId: string;
  email: string; // normalized lowercased email
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdBy: string; // uid
  createdAt?: unknown;
  respondedAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  readonly selectedCompanyId = signal<string | null>(localStorage.getItem('companyId') || null);

  setSelectedCompanyId(id: string | null): void {
    this.selectedCompanyId.set(id);
    if (id) localStorage.setItem('companyId', id); else localStorage.removeItem('companyId');
  }

  getMyCompanies$(): Observable<Company[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([] as Company[]);
        const membershipsQ = query(collection(this.firestore, 'companyMemberships'), where('userId', '==', user.uid));
        return collectionData(membershipsQ, { idField: 'id' }).pipe(
          map((ms: any[]) => ms.map(m => m.companyId)),
          switchMap(companyIds => companyIds.length
            ? collectionData(query(collection(this.firestore, 'companies'), where('__name__', 'in', companyIds)), { idField: 'id' }) as Observable<Company[]>
            : of([] as Company[])
          )
        );
      })
    );
  }

  getMembershipFor$(companyId: string, userId: string): Observable<CompanyMembership | null> {
    const q = query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }).pipe(map((rows: any[]) => rows[0] ?? null)) as any;
  }

  getMyMembership$(companyId: string): Observable<CompanyMembership | null> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of(null);
        const q = query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', user.uid));
        return collectionData(q, { idField: 'id' }).pipe(map((rows: any[]) => rows[0] ?? null));
      })
    );
  }

  getMembershipsForCurrentCompany$(): Observable<CompanyMembership[]> {
    const companyId = this.selectedCompanyId();
    if (!companyId) return of([] as CompanyMembership[]);
    const q = query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<CompanyMembership[]>;
  }

  async createInvitation(email: string, role: 'viewer' | 'editor' | 'admin' = 'viewer'): Promise<string> {
    const companyId = this.selectedCompanyId(); if (!companyId) throw new Error('No company selected');
    const createdBy = this.auth.currentUser?.uid as string;
    const normalized = email.trim().toLowerCase();
    const ref = await addDoc(collection(this.firestore, 'companyInvites'), { companyId, email: normalized, role, status: 'pending', createdBy, createdAt: serverTimestamp() });
    return ref.id;
  }

  getMyInvitations$(): Observable<CompanyInvite[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        const email = user?.email?.toLowerCase();
        if (!email) return of([] as CompanyInvite[]);
        const q = query(collection(this.firestore, 'companyInvites'), where('email', '==', email), where('status', '==', 'pending'));
        return collectionData(q, { idField: 'id' }) as unknown as Observable<CompanyInvite[]>;
      })
    );
  }

  async acceptInvitation(inviteId: string): Promise<void> {
    const inviteSnap = await getDoc(doc(this.firestore, `companyInvites/${inviteId}`));
    if (!inviteSnap.exists()) throw new Error('Invitation not found');
    const invite = inviteSnap.data() as any;
    const uid = this.auth.currentUser?.uid as string;
    const exists = await getDocs(query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', invite.companyId), where('userId', '==', uid)));
    if (exists.empty) {
      await addDoc(collection(this.firestore, 'companyMemberships'), { companyId: invite.companyId, userId: uid, role: invite.role, createdAt: serverTimestamp() });
    }
    await updateDoc(doc(this.firestore, `companyInvites/${inviteId}`), { status: 'accepted', respondedAt: serverTimestamp() });
    this.setSelectedCompanyId(invite.companyId);
  }

  async declineInvitation(inviteId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `companyInvites/${inviteId}`), { status: 'declined', respondedAt: serverTimestamp() });
  }

  async addUserToCurrentCompanyByEmail(email: string, role: 'viewer' | 'editor' | 'admin' = 'viewer'): Promise<void> {
    await this.createInvitation(email, role);
  }

  async updateMembershipRole(userId: string, role: 'viewer' | 'editor' | 'admin'): Promise<void> {
    const companyId = this.selectedCompanyId();
    if (!companyId) throw new Error('No company selected');
    const qSnap = await getDocs(query(collection(this.firestore, 'companyMemberships'), where('companyId', '==', companyId), where('userId', '==', userId)));
    if (qSnap.empty) throw new Error('Membership not found');
    const id = qSnap.docs[0].id;
    await updateDoc(doc(this.firestore, `companyMemberships/${id}`), { role });
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
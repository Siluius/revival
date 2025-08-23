import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, orderBy, query, serverTimestamp, updateDoc, where, writeBatch, increment, getDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { NewPayment, Payment } from './payments.interfaces';
import { ActivitiesService } from '../activities/activities.service';
import { Auth } from '@angular/fire/auth';
import { CompanyService } from '../company/company.service';

const NIO_TO_USD = 1 / 37; // 37 NIO = 1 USD

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'payments');
  private readonly activities = inject(ActivitiesService);
  private readonly auth = inject(Auth);
  private readonly company = inject(CompanyService);

  private toUSD(currency: 'USD' | 'NIO', amount: number): { amountUSD: number; originalAmount?: number; originalCurrency?: 'USD' | 'NIO' } {
    if (currency === 'USD') return { amountUSD: amount, originalAmount: amount, originalCurrency: 'USD' };
    return { amountUSD: parseFloat((amount * NIO_TO_USD).toFixed(2)), originalAmount: amount, originalCurrency: 'NIO' };
  }

  getByAttendant$(attendantId: string): Observable<Payment[]> {
    const companyId = this.company.selectedCompanyId();
    const q = companyId ? query(this.collectionRef, where('companyId', '==', companyId), where('attendantId', '==', attendantId), orderBy('createdAt', 'desc')) : query(this.collectionRef, where('attendantId', '==', attendantId), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Payment[]>;
  }

  getById$(id: string): Observable<Payment | null> {
    const ref = doc(this.firestore, `payments/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Payment) ?? null));
  }

  getCounter$(attendantId: string, eventId: string): Observable<number> {
    const companyId = this.company.selectedCompanyId();
    const ref = doc(this.firestore, `attendantEventPayments/${companyId}_${attendantId}_${eventId}`);
    return docData(ref).pipe(map((d: any) => (d?.totalUSD as number) ?? 0));
  }

  async create(data: NewPayment): Promise<string> {
    const companyId = this.company.selectedCompanyId();
    const { amountUSD, originalAmount, originalCurrency } = this.toUSD(data.currency, data.amount);
    const result = await addDoc(this.collectionRef, {
      companyId,
      attendantId: data.attendantId,
      eventId: data.eventId,
      amountUSD,
      originalAmount,
      originalCurrency,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await this.updateCounters(data.attendantId, data.eventId, amountUSD);
    await this.recalculateAttendantEventStatus(data.attendantId, data.eventId);
    const user = this.auth.currentUser;
    await this.activities.logEntity('payments', 'create', 'payments', result.id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { data, amountUSD, companyId });
    return result.id;
  }

  async update(id: string, data: Partial<NewPayment> & { currency?: 'USD' | 'NIO'; amount?: number }): Promise<void> {
    const ref = doc(this.firestore, `payments/${id}`);
    const current = await this.getByIdOnce(id);
    if (!current) return;
    const newCurrency = data.currency ?? (current.originalCurrency ?? 'USD');
    const newAmount = data.amount ?? (current.originalAmount ?? current.amountUSD);
    const { amountUSD, originalAmount, originalCurrency } = this.toUSD(newCurrency, newAmount);
    const delta = amountUSD - current.amountUSD;

    const batch = writeBatch(this.firestore);
    batch.update(ref, { amountUSD, originalAmount, originalCurrency, updatedAt: serverTimestamp() });
    const counterRef = doc(this.firestore, `attendantEventPayments/${this.company.selectedCompanyId()}_${current.attendantId}_${current.eventId}`);
    batch.set(counterRef, { companyId: this.company.selectedCompanyId(), attendantId: current.attendantId, eventId: current.eventId, totalUSD: increment(delta) }, { merge: true });
    await batch.commit();
    await this.recalculateAttendantEventStatus(current.attendantId, current.eventId);
    const user = this.auth.currentUser;
    await this.activities.logEntity('payments', 'update', 'payments', id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { previous: current, updated: { amountUSD, originalAmount, originalCurrency } });
  }

  async delete(id: string): Promise<void> {
    const current = await this.getByIdOnce(id);
    if (!current) return;
    await deleteDoc(doc(this.firestore, `payments/${id}`));
    await this.updateCounters(current.attendantId, current.eventId, -current.amountUSD);
    await this.recalculateAttendantEventStatus(current.attendantId, current.eventId);
    const user = this.auth.currentUser;
    await this.activities.logEntity('payments', 'delete', 'payments', id, { uid: user?.uid ?? null, email: user?.email ?? null, displayName: user?.displayName ?? null }, { previous: current });
  }

  private async getByIdOnce(id: string): Promise<Payment | null> {
    const ref = doc(this.firestore, `payments/${id}`);
    const snap = await docData(ref, { idField: 'id' }).pipe(map(d => (d as Payment) ?? null)).toPromise();
    return snap ?? null;
  }

  private async updateCounters(attendantId: string, eventId: string, deltaUSD: number): Promise<void> {
    const ref = doc(this.firestore, `attendantEventPayments/${this.company.selectedCompanyId()}_${attendantId}_${eventId}`);
    await updateDoc(ref, { totalUSD: increment(deltaUSD) }).catch(async () => {
      await updateDoc(ref, { companyId: this.company.selectedCompanyId(), attendantId, eventId, totalUSD: increment(deltaUSD) }).catch(async () => {
        const batch = writeBatch(this.firestore);
        batch.set(ref, { companyId: this.company.selectedCompanyId(), attendantId, eventId, totalUSD: deltaUSD });
        await batch.commit();
      });
    });
  }

  private async recalculateAttendantEventStatus(attendantId: string, eventId: string): Promise<void> {
    const ref = doc(this.firestore, `attendantEventPayments/${this.company.selectedCompanyId()}_${attendantId}_${eventId}`);
    const counterSnap = await getDoc(ref);
    const totalUSD = (counterSnap.exists() ? (counterSnap.data() as any)?.totalUSD : 0) as number;
    const eventSnap = await getDoc(doc(this.firestore, `events/${eventId}`));
    const costUSD = (eventSnap.exists() ? (eventSnap.data() as any)?.costUSD : null) as number | null;
    let status: 'unpaid' | 'partial' | 'paid' | 'cancelled' = 'unpaid';
    if (costUSD && costUSD > 0) {
      status = totalUSD >= costUSD ? 'cancelled' : totalUSD > 0 ? 'partial' : 'unpaid';
    } else {
      status = totalUSD > 0 ? 'partial' : 'unpaid';
    }
    const attRef = doc(this.firestore, `attendants/${attendantId}`);
    await updateDoc(attRef, { [`eventPayments.${eventId}`]: { totalUSD, status } });
  }
}
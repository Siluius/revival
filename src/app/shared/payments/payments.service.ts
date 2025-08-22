import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, orderBy, query, serverTimestamp, updateDoc, where, writeBatch, increment } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { NewPayment, Payment } from './payments.interfaces';

const NIO_TO_USD = 1 / 37; // 37 NIO = 1 USD

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'payments');

  private toUSD(currency: 'USD' | 'NIO', amount: number): { amountUSD: number; originalAmount?: number; originalCurrency?: 'USD' | 'NIO' } {
    if (currency === 'USD') return { amountUSD: amount, originalAmount: amount, originalCurrency: 'USD' };
    return { amountUSD: parseFloat((amount * NIO_TO_USD).toFixed(2)), originalAmount: amount, originalCurrency: 'NIO' };
  }

  getByAttendant$(attendantId: string): Observable<Payment[]> {
    const q = query(this.collectionRef, where('attendantId', '==', attendantId), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Payment[]>;
  }

  getById$(id: string): Observable<Payment | null> {
    const ref = doc(this.firestore, `payments/${id}`);
    return docData(ref, { idField: 'id' }).pipe(map(d => (d as Payment) ?? null));
  }

  getCounter$(attendantId: string, eventId: string): Observable<number> {
    const ref = doc(this.firestore, `attendantEventPayments/${attendantId}_${eventId}`);
    return docData(ref).pipe(map((d: any) => (d?.totalUSD as number) ?? 0));
  }

  async create(data: NewPayment): Promise<string> {
    const { amountUSD, originalAmount, originalCurrency } = this.toUSD(data.currency, data.amount);
    const result = await addDoc(this.collectionRef, {
      attendantId: data.attendantId,
      eventId: data.eventId,
      amountUSD,
      originalAmount,
      originalCurrency,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await this.updateCounters(data.attendantId, data.eventId, amountUSD);
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
    const counterRef = doc(this.firestore, `attendantEventPayments/${current.attendantId}_${current.eventId}`);
    batch.set(counterRef, { attendantId: current.attendantId, eventId: current.eventId, totalUSD: increment(delta) }, { merge: true });
    await batch.commit();
  }

  async delete(id: string): Promise<void> {
    const current = await this.getByIdOnce(id);
    if (!current) return;
    await deleteDoc(doc(this.firestore, `payments/${id}`));
    await this.updateCounters(current.attendantId, current.eventId, -current.amountUSD);
  }

  private async getByIdOnce(id: string): Promise<Payment | null> {
    const ref = doc(this.firestore, `payments/${id}`);
    const snap = await docData(ref, { idField: 'id' }).pipe(map(d => (d as Payment) ?? null)).toPromise();
    return snap ?? null;
  }

  private async updateCounters(attendantId: string, eventId: string, deltaUSD: number): Promise<void> {
    const counterRef = doc(this.firestore, `attendantEventPayments/${attendantId}_${eventId}`);
    await updateDoc(counterRef, { totalUSD: increment(deltaUSD) }).catch(async () => {
      await updateDoc(counterRef, { attendantId, eventId, totalUSD: increment(deltaUSD) }).catch(async () => {
        const batch = writeBatch(this.firestore);
        batch.set(counterRef, { attendantId, eventId, totalUSD: deltaUSD });
        await batch.commit();
      });
    });
  }
}
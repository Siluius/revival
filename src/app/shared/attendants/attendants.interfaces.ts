export type Gender = 'male' | 'female';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';

export interface Attendant {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  address?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null; // stored as Firestore Timestamp/Date
  gender?: Gender | null;
  organizationId?: string | null;
  paymentStatus?: PaymentStatus | null;
  // map of eventId -> totalUSD and status
  eventPayments?: Record<string, { totalUSD: number; status: PaymentStatus } | undefined>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewAttendant = Pick<Attendant, 'firstName' | 'lastName' | 'address' | 'phone' | 'dateOfBirth' | 'gender' | 'organizationId'>;

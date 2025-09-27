export type Gender = 'male' | 'female';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type TShirtSize = '18' | 'S' | 'M' | 'L' | 'XL';

export interface Attendant {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  address?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null; // stored as Firestore Timestamp/Date
  gender?: Gender | null;
  tShirtSize?: TShirtSize | null;
  organizationId?: string | null;
  paymentStatus?: PaymentStatus | null;
  // map of eventId -> totalUSD and status
  eventPayments?: Record<string, { totalUSD: number; status: PaymentStatus } | undefined>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewAttendant = Pick<Attendant, 'firstName' | 'lastName' | 'address' | 'phone' | 'dateOfBirth' | 'gender' | 'tShirtSize' | 'organizationId'>;
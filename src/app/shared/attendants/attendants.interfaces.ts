export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Attendant {
  id: string;
  firstName: string;
  lastName: string;
  address?: string | null;
  dateOfBirth?: Date | null; // stored as Firestore Timestamp/Date
  gender?: Gender | null;
  organizationId?: string | null;
  paymentStatus?: PaymentStatus | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewAttendant = Pick<Attendant, 'firstName' | 'lastName' | 'address' | 'dateOfBirth' | 'gender' | 'organizationId'>;
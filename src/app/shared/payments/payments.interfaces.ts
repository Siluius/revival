export type CurrencyCode = 'USD' | 'NIO';

export interface Payment {
  id: string;
  attendantId: string;
  eventId: string;
  amountUSD: number; // stored normalized in USD
  originalAmount?: number | null; // if original currency is NIO, capture raw amount
  originalCurrency?: CurrencyCode | null; // original currency, default USD
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewPayment = {
  attendantId: string;
  eventId: string;
  currency: CurrencyCode;
  amount: number;
};
export interface AppEvent {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  costUSD?: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewAppEvent = Pick<AppEvent, 'name' | 'description' | 'costUSD'>;
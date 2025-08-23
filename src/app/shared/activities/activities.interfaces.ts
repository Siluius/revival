export type ActivityModule = 'auth' | 'attendants' | 'events' | 'payments';
export type ActivityAction = 'login' | 'logout' | 'create' | 'update' | 'delete';

export interface ActivityRecord {
  id: string;
  companyId?: string | null;
  module: ActivityModule;
  action: ActivityAction;
  entityCollection?: string | null;
  entityId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userDisplayName?: string | null;
  details?: unknown;
  createdAt?: unknown;
}

export type NewActivityRecord = Omit<ActivityRecord, 'id' | 'createdAt'>;
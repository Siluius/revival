export type AppUserRole = 'viewer' | 'editor' | 'admin';

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: AppUserRole; // defaults to 'viewer'
  preferences?: Record<string, unknown>;
}



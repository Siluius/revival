export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  preferences?: Record<string, unknown>;
}



export interface Company {
  id: string;
  name: string;
  createdBy: string; // uid
  createdAt?: unknown;
}

export interface CompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  createdAt?: unknown;
}
export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NewOrganization = Pick<Organization, 'name' | 'description'>;
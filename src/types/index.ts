export type UserType = 'consumer' | 'provider';

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  name?: string | null; // legacy
  userType: UserType;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Profile extends User {
  avatar_url?: string | null;
}

export interface AuthResult {
  data: any;
  error: any;
  needsConfirmation?: boolean;
  message?: string;
}

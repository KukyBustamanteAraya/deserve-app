export interface User {
  id: string;
  email: string;
  fullName?: string;
  userType?: 'consumer' | 'provider';
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult {
  data: any;
  error: AuthError | null;
  needsConfirmation?: boolean;
  message?: string;
}

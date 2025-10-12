// src/types/api.ts
// Canonical API response helpers (single source of truth)
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ApiList<T> = {
  items: T[];
  total?: number;
};

export type ApiData<T> = { data: T }; // convenience alias

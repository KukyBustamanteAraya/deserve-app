// src/types/api.ts
// Canonical API response helpers (single source of truth)
export type ApiResponse<T> = {
  data: T;
  error?: string;
};

export type ApiList<T> = {
  items: T[];
  total?: number;
};

export type ApiData<T> = { data: T }; // convenience alias

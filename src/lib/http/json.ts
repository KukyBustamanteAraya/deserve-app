// Lightweight fetch wrapper with type safety and error handling
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function json<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If we can't parse as JSON, use the raw text
      if (errorText) {
        errorMessage = errorText;
      }
    }

    throw new HttpError(errorMessage, response.status, response);
  }

  const text = await response.text();
  if (!text) {
    throw new HttpError('Empty response body', response.status, response);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new HttpError(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
      response.status,
      response
    );
  }
}

// Convenience methods
export const http = {
  get: <T>(url: string, init?: Omit<RequestInit, 'method'>) =>
    json<T>(url, { ...init, method: 'GET' }),

  post: <T>(url: string, data?: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    json<T>(url, {
      ...init,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    json<T>(url, {
      ...init,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, init?: Omit<RequestInit, 'method'>) =>
    json<T>(url, { ...init, method: 'DELETE' }),
};
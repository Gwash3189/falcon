import type { CliConfig } from './config.js';

interface ApiError {
  error: { code: string; message: string };
}

export class ApiResponseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export async function apiFetch<T>(
  config: CliConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.serverUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as { data: T } | ApiError;

  if (!res.ok) {
    const err = body as ApiError;
    throw new ApiResponseError(
      err.error?.code ?? 'UNKNOWN',
      err.error?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }

  return (body as { data: T }).data;
}

import type { ApiResponse } from '@hotwords/shared';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'REQUEST_FAILED',
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  let payload: ApiResponse<T>;
  try {
    payload = await response.json() as ApiResponse<T>;
  } catch {
    throw new ApiError('服务器返回了无法识别的数据');
  }
  if (!response.ok || !payload.success) {
    if (!payload.success) {
      throw new ApiError(payload.error.message, payload.error.code, payload.error.details);
    }
    throw new ApiError(`请求失败（${response.status}）`);
  }
  return payload.data;
}

export function jsonRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

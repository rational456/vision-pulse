import { ExternalProviderError } from '../external-provider.error.js';

export type FetchLike = typeof fetch;

export interface FetchJsonOptions {
  retries?: number;
  retryDelayMs?: number;
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchJson(
  provider: string,
  url: URL,
  init: RequestInit,
  fetchImplementation: FetchLike,
  options: FetchJsonOptions = {},
): Promise<unknown> {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 750;
  let response: Response | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      response = await fetchImplementation(url, init);
    } catch (error) {
      if (attempt < retries) {
        await delay(retryDelayMs);
        continue;
      }
      throw new ExternalProviderError(provider, `${provider} 请求失败`, null, {
        cause: error,
      });
    }

    if (response.ok || !isTransientStatus(response.status) || attempt === retries) break;
    await delay(retryDelayMs);
  }

  if (!response?.ok) {
    throw new ExternalProviderError(
      provider,
      `${provider} 返回了 HTTP ${response?.status ?? '未知状态'}`,
      response?.status ?? null,
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ExternalProviderError(provider, `${provider} 返回了无效 JSON`, response.status, {
      cause: error,
    });
  }
}

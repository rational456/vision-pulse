import { ExternalProviderError } from '../external-provider.error.js';

export type FetchLike = typeof fetch;

export async function fetchJson(
  provider: string,
  url: URL,
  init: RequestInit,
  fetchImplementation: FetchLike,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetchImplementation(url, init);
  } catch (error) {
    throw new ExternalProviderError(provider, `${provider} 请求失败`, null, {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new ExternalProviderError(
      provider,
      `${provider} 返回了 HTTP ${response.status}`,
      response.status,
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

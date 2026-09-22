import { describe, expect, it, vi } from 'vitest';
import { fetchJson } from './fetch-json.js';

describe('fetchJson', () => {
  it('retries a transient provider response once', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    const result = await fetchJson(
      'Example',
      new URL('https://example.com/data'),
      {},
      fetchMock,
      { retryDelayMs: 0 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });
});

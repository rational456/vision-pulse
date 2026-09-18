import { describe, expect, it, vi } from 'vitest';
import { DblpClient } from './dblp.client.js';

describe('DblpClient', () => {
  it('maps DBLP search results into normalized bibliography records', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            hits: {
              hit: [
                {
                  info: {
                    authors: {
                      author: [{ text: 'Ada Chen' }, { text: 'Bo Lin' }],
                    },
                    title: 'Learning &amp; Seeing.',
                    venue: 'CVPR',
                    year: '2024',
                    key: 'conf/cvpr/Example24',
                    doi: '10.1000/example',
                    ee: 'https://doi.org/10.1000/example',
                    url: 'https://dblp.org/rec/conf/cvpr/Example24',
                  },
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new DblpClient(fetchMock);

    const papers = await client.searchByTitle('Learning & Seeing');

    expect(papers).toEqual([
      {
        externalId: 'conf/cvpr/Example24',
        title: 'Learning & Seeing.',
        authors: ['Ada Chen', 'Bo Lin'],
        venue: 'CVPR',
        year: 2024,
        paperUrl: 'https://doi.org/10.1000/example',
        doi: '10.1000/example',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('format=json');
  });
});

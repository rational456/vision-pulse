import { describe, expect, it, vi } from 'vitest';
import { OpenAlexClient } from './openalex.client.js';

describe('OpenAlexClient', () => {
  it('reconstructs abstracts and maps topics from work search results', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 'https://openalex.org/W123',
              doi: 'https://doi.org/10.1000/example',
              title: 'Open World Object Detection',
              publication_year: 2024,
              primary_location: {
                landing_page_url: 'https://doi.org/10.1000/example',
                source: { display_name: 'CVPR' },
              },
              abstract_inverted_index: {
                Open: [0],
                world: [1],
                detection: [2],
                matters: [3],
              },
              topics: [
                { display_name: 'Object Detection' },
                { display_name: 'Computer Vision' },
              ],
              authorships: [
                { author: { display_name: 'Ada Chen' } },
                { author: { display_name: 'Bo Lin' } },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new OpenAlexClient(fetchMock);

    const papers = await client.searchByTitle('Open World Object Detection');

    expect(papers).toEqual([
      {
        externalId: 'W123',
        title: 'Open World Object Detection',
        authors: ['Ada Chen', 'Bo Lin'],
        venue: 'CVPR',
        year: 2024,
        abstract: 'Open world detection matters',
        fieldsOfStudy: ['Object Detection', 'Computer Vision'],
        paperUrl: 'https://doi.org/10.1000/example',
        doi: '10.1000/example',
        source: 'openalex',
      },
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('per-page=10');
  });
});

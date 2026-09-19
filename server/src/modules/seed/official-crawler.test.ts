import { describe, expect, it, vi } from 'vitest';
import { OfficialConferenceCrawler, parseOfficialDetail } from './official-crawler.js';

describe('official conference detail parser', () => {
  it('reads title, authors and abstract from a CVF-style page', () => {
    const paper = parseOfficialDetail(`
      <div id="papertitle">A &amp; B Vision Paper<dd></div>
      <div id="authors"><b><i>Ada Chen, Bo Lin</i></b>; CVPR 2024</div>
      <div id="abstract">This is a sufficiently long public abstract about computer vision research and object detection.</div>
    `, 'https://openaccess.thecvf.com/content/CVPR2024/html/example.html',
    { conference: 'CVPR', year: 2024 });

    expect(paper).toEqual(expect.objectContaining({
      title: 'A & B Vision Paper',
      authors: ['Ada Chen', 'Bo Lin'],
      conference: 'CVPR',
      year: 2024,
    }));
  });

  it('rejects pages without a credible abstract', () => {
    expect(parseOfficialDetail('<div id="papertitle">Title</div>',
      'https://example.com/paper', { conference: 'ECCV', year: 2024 })).toBeNull();
  });

  it('retries transient connection failures but not HTTP refusals', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('socket closed'))
      .mockResolvedValueOnce({ ok: true, text: async () => '<html>ok</html>' });
    const crawler = new OfficialConferenceCrawler(fetchMock as typeof fetch);

    expect(await crawler.html('https://example.com/page')).toBe('<html>ok</html>');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockResolvedValue({ ok: false, status: 403 });
    await expect(crawler.html('https://example.com/page')).rejects.toThrow('403');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

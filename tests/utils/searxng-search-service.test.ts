import SearxngSearchService from '../../src/utils/searxng-search-service';

describe('SearxngSearchService', () => {
  let service: SearxngSearchService;

  beforeEach(() => {
    service = new SearxngSearchService('https://searxng.example.com/');
    jest.spyOn(
      service as unknown as { fetchUrl: (url: string) => Promise<string> },
      'fetchUrl',
    ).mockImplementation(() => Promise.resolve(JSON.stringify({
      results: [
        {
          title: 'Example Result 1',
          url: 'https://example.com/1',
          content: 'Sample snippet 1',
        },
        {
          title: 'Example Result 2',
          url: 'https://example.com/2',
          content: 'Sample snippet 2',
        },
      ],
    })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('search', () => {
    it('parses SearXNG JSON results into the shared SearchResult shape', async () => {
      const results = await service.search('test query');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: 'Example Result 1',
        snippet: 'Sample snippet 1',
        link: 'https://example.com/1',
      });
    });

    it('drops the trailing slash from the configured base URL', async () => {
      const fetchSpy = (service as unknown as {
        fetchUrl: (url: string) => Promise<string>;
      }).fetchUrl as jest.Mock;
      await service.search('hello');
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://searxng.example.com/search?q=hello&format=json',
      );
    });

    it('returns an empty array when the response has no results', async () => {
      jest.spyOn(
        service as unknown as { fetchUrl: (url: string) => Promise<string> },
        'fetchUrl',
      ).mockImplementation(() => Promise.resolve(JSON.stringify({})));
      await expect(service.search('q')).resolves.toEqual([]);
    });

    it('throws a clear error when the response is not JSON', async () => {
      jest.spyOn(
        service as unknown as { fetchUrl: (url: string) => Promise<string> },
        'fetchUrl',
      ).mockImplementation(() => Promise.resolve('<html>not json</html>'));
      await expect(service.search('q')).rejects.toThrow(/non-JSON/);
    });
  });

  describe('formatSearchResults', () => {
    it('formats results with the same shape as other search services', () => {
      const formatted = service.formatSearchResults([
        { title: 'A', snippet: 'short', link: 'https://a.example' },
      ]);
      expect(formatted).toContain('SEARCH RESULTS:');
      expect(formatted).toContain('[Source 1] A');
      expect(formatted).toContain('URL: https://a.example');
    });

    it('handles empty results', () => {
      expect(service.formatSearchResults([])).toBe(
        'No relevant business information found.',
      );
    });
  });
});

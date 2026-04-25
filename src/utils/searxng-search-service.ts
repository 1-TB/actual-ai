import * as http from 'http';
import * as https from 'https';
import { SearchResult } from '../types';

interface SearxngRawResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
}

interface SearxngResponse {
  results?: SearxngRawResult[];
}

export default class SearxngSearchService {
  private readonly baseUrl: string;

  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey = '') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  public async search(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim().slice(0, 200);
    if (!trimmed) return [];

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(trimmed)}&format=json`;
    const body = await this.fetchUrl(url);

    let parsed: SearxngResponse;
    try {
      parsed = JSON.parse(body) as SearxngResponse;
    } catch {
      throw new Error('SearXNG returned a non-JSON response. Ensure JSON output is enabled on the instance.');
    }

    if (!Array.isArray(parsed.results)) return [];

    return parsed.results
      .slice(0, 5)
      .map((r): SearchResult => ({
        title: typeof r.title === 'string' ? r.title : '',
        snippet: typeof r.content === 'string' ? r.content : '',
        link: typeof r.url === 'string' ? r.url : '',
      }))
      .filter((r) => r.link);
  }

  public formatSearchResults(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return 'No relevant business information found.';
    }

    const formatted = results
      .map((result, index) => `[Source ${index + 1}] ${result.title}\n`
        + `${(result.snippet || '').substring(0, 150)}...\n`
        + `URL: ${result.link}`)
      .join('\n\n');

    return `SEARCH RESULTS:\n${formatted}`;
  }

  private async fetchUrl(url: string): Promise<string> {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'http:' ? http : https;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'actual-ai/searxng',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return new Promise((resolve, reject) => {
      const req = transport.request(
        {
          method: 'GET',
          hostname: parsed.hostname,
          port: parsed.port || undefined,
          path: `${parsed.pathname}${parsed.search}`,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
              return;
            }
            const error = new Error(
              `SearXNG request failed with status code ${res.statusCode}`,
            ) as Error & { statusCode?: number };
            error.statusCode = res.statusCode;
            reject(error);
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
  }
}

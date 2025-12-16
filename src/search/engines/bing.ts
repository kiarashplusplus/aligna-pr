/**
 * Bing Search API engine
 */

import axios from 'axios';
import { config } from '../../config';
import { SearchResult, SearchOptions } from '../../types';

export class BingSearchEngine {
  private apiKey: string | undefined;
  private readonly API_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

  constructor() {
    this.apiKey = config.bingSearchApiKey;
  }

  /**
   * Check if the API is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Search using Bing Search API
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('Bing Search API not configured. Skipping Bing search.');
      return [];
    }

    const { query, limit = 10 } = options;
    const results: SearchResult[] = [];

    try {
      // Bing returns max 50 results per request
      const response = await axios.get(this.API_ENDPOINT, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey!,
        },
        params: {
          q: query,
          count: Math.min(limit, 50),
          responseFilter: 'Webpages',
          mkt: 'en-US',
        },
      });

      const webPages = response.data.webPages?.value || [];

      for (const page of webPages) {
        results.push({
          title: page.name || '',
          url: page.url || '',
          snippet: page.snippet || '',
          source: 'bing',
        });

        if (results.length >= limit) break;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Bing Search API error: ${error.response?.status} - ${error.message}`);
      } else {
        console.error('Bing Search error:', error);
      }
    }

    return results;
  }

  /**
   * Search with site restriction
   */
  async searchSite(site: string, query: string, limit = 10): Promise<SearchResult[]> {
    return this.search({
      query: `site:${site} ${query}`,
      limit,
    });
  }
}

export const bingSearch = new BingSearchEngine();

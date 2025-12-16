/**
 * Google Custom Search API engine
 */

import axios from 'axios';
import { config } from '../../config';
import { SearchResult, SearchOptions } from '../../types';

export class GoogleSearchEngine {
  private apiKey: string | undefined;
  private engineId: string | undefined;

  constructor() {
    this.apiKey = config.googleSearchApiKey;
    this.engineId = config.googleSearchEngineId;
  }

  /**
   * Check if the API is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.engineId);
  }

  /**
   * Search using Google Custom Search API
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('Google Search API not configured. Skipping Google search.');
      return [];
    }

    const { query, limit = 10, dateRestrict } = options;
    const results: SearchResult[] = [];

    try {
      // Google CSE returns max 10 results per request
      const maxPages = Math.ceil(Math.min(limit, 100) / 10);

      for (let page = 0; page < maxPages; page++) {
        const startIndex = page * 10 + 1;
        
        const params: Record<string, string | number> = {
          key: this.apiKey!,
          cx: this.engineId!,
          q: query,
          start: startIndex,
          num: Math.min(10, limit - results.length),
        };

        if (dateRestrict) {
          params.dateRestrict = dateRestrict;
        }

        const response = await axios.get(
          'https://www.googleapis.com/customsearch/v1',
          { params }
        );

        const items = response.data.items || [];
        
        for (const item of items) {
          results.push({
            title: item.title || '',
            url: item.link || '',
            snippet: item.snippet || '',
            source: 'google',
          });

          if (results.length >= limit) break;
        }

        if (items.length < 10 || results.length >= limit) break;

        // Rate limit between pages
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Google Search API error: ${error.response?.status} - ${error.message}`);
      } else {
        console.error('Google Search error:', error);
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

export const googleSearch = new GoogleSearchEngine();

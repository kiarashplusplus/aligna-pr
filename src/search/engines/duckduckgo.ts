/**
 * DuckDuckGo Search Engine
 * Uses DuckDuckGo HTML interface - no API key required
 * Good for privacy-focused audiences and as a fallback when other APIs aren't configured
 */

import { load } from 'cheerio';
import { scraper } from '../scraper';
import { SearchResult, SearchOptions } from '../../types';
import { logger } from '../../utils';

export class DuckDuckGoSearchEngine {
  private readonly HTML_ENDPOINT = 'https://html.duckduckgo.com/html/';

  /**
   * DuckDuckGo is always available (no API key needed)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Search using DuckDuckGo HTML interface
   * This scrapes the HTML results page - no API needed
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.HTML_ENDPOINT}?q=${encodedQuery}`;

      const html = await scraper.fetch(url, true); // Skip robots.txt for search engine
      const $ = load(html);

      // Parse search results
      $('.result, .web-result').each((_, element) => {
        if (results.length >= limit) return false;

        const resultEl = $(element);
        
        // Try multiple selectors for title link
        const titleEl = resultEl.find('.result__title a, .result__a, a.result__url').first();
        const snippetEl = resultEl.find('.result__snippet, .result__body');

        let href = titleEl.attr('href') || '';
        const title = titleEl.text().trim();
        const snippet = snippetEl.text().trim();

        if (!href || !title) return;

        // DuckDuckGo wraps URLs in redirect, extract actual URL
        const actualUrl = this.extractActualUrl(href);

        if (actualUrl && this.isValidUrl(actualUrl)) {
          results.push({
            title,
            url: actualUrl,
            snippet,
            source: 'duckduckgo',
          });
        }
      });

      // If no results from standard parsing, try alternate selectors
      if (results.length === 0) {
        $('a.result__a').each((_, element) => {
          if (results.length >= limit) return false;

          const href = $(element).attr('href') || '';
          const title = $(element).text().trim();
          const actualUrl = this.extractActualUrl(href);

          if (actualUrl && title && this.isValidUrl(actualUrl)) {
            results.push({
              title,
              url: actualUrl,
              snippet: '',
              source: 'duckduckgo',
            });
          }
        });
      }

      logger.debug(`DuckDuckGo found ${results.length} results for: ${query}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`DuckDuckGo search error: ${error.message}`);
      } else {
        logger.error('DuckDuckGo search error:', error);
      }
    }

    return results;
  }

  /**
   * Extract actual URL from DuckDuckGo redirect wrapper
   */
  private extractActualUrl(href: string): string {
    // DuckDuckGo uses uddg parameter for actual URL
    const uddgMatch = href.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      return decodeURIComponent(uddgMatch[1]);
    }

    // Also check for //duckduckgo.com/l/?... format
    const lMatch = href.match(/\/l\/\?.*?uddg=([^&]+)/);
    if (lMatch) {
      return decodeURIComponent(lMatch[1]);
    }

    // If no redirect wrapper, return as-is if it's a valid URL
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }

    return '';
  }

  /**
   * Validate URL is a proper web URL (not DuckDuckGo internal)
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Exclude DuckDuckGo's own pages
      if (parsed.hostname.includes('duckduckgo.com')) {
        return false;
      }
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
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

  /**
   * Search for recent content (DuckDuckGo time filter)
   */
  async searchRecent(query: string, limit = 10, timeRange: 'd' | 'w' | 'm' | 'y' = 'm'): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      // df=d (day), df=w (week), df=m (month), df=y (year)
      const url = `${this.HTML_ENDPOINT}?q=${encodedQuery}&df=${timeRange}`;

      const html = await scraper.fetch(url, true);
      const $ = load(html);

      $('.result, .web-result').each((_, element) => {
        if (results.length >= limit) return false;

        const titleEl = $(element).find('.result__title a, .result__a').first();
        const snippetEl = $(element).find('.result__snippet');

        const href = titleEl.attr('href') || '';
        const title = titleEl.text().trim();
        const snippet = snippetEl.text().trim();

        const actualUrl = this.extractActualUrl(href);

        if (actualUrl && title && this.isValidUrl(actualUrl)) {
          results.push({
            title,
            url: actualUrl,
            snippet,
            source: 'duckduckgo',
          });
        }
      });
    } catch (error) {
      logger.error('DuckDuckGo recent search error:', error);
    }

    return results;
  }
}

export const duckduckgoSearch = new DuckDuckGoSearchEngine();

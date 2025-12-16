/**
 * Custom crawl engine for direct site searches
 * Uses DuckDuckGo HTML results and direct site crawling
 */

import { load } from 'cheerio';
import { scraper } from '../scraper';
import { SearchResult, SearchOptions } from '../../types';
import { SEARCH_SOURCES } from '../../config';
import { logger } from '../../utils';

export class CustomCrawlEngine {
  /**
   * Search DuckDuckGo HTML results (no API needed)
   */
  async searchDuckDuckGo(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const html = await scraper.fetch(url, true);
      const $ = load(html);

      $('.result').each((_, element) => {
        if (results.length >= limit) return false;

        const titleEl = $(element).find('.result__title a');
        const snippetEl = $(element).find('.result__snippet');

        const href = titleEl.attr('href');
        const title = titleEl.text().trim();
        const snippet = snippetEl.text().trim();

        if (href && title) {
          // DuckDuckGo wraps URLs, extract actual URL
          const urlMatch = href.match(/uddg=([^&]+)/);
          const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : href;

          results.push({
            title,
            url: actualUrl,
            snippet,
            source: 'duckduckgo',
          });
        }
      });
    } catch (error) {
      logger.error('DuckDuckGo search error:', error);
    }

    return results;
  }

  /**
   * Search dev.to articles
   */
  async searchDevTo(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://dev.to/search?q=${encodedQuery}`;

      const html = await scraper.fetch(url);
      const $ = load(html);

      $('article.crayons-story').each((_, element) => {
        if (results.length >= limit) return false;

        const titleEl = $(element).find('h2 a, h3 a').first();
        const href = titleEl.attr('href');
        const title = titleEl.text().trim();

        if (href && title) {
          results.push({
            title,
            url: href.startsWith('http') ? href : `https://dev.to${href}`,
            snippet: $(element).find('.crayons-story__tags, .crayons-story__indention p').text().trim(),
            source: 'dev.to',
          });
        }
      });
    } catch (error) {
      logger.error('dev.to search error:', error);
    }

    return results;
  }

  /**
   * Search Medium articles (via DuckDuckGo)
   */
  async searchMedium(query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchDuckDuckGo({
      query: `site:medium.com ${query}`,
      limit,
    });
  }

  /**
   * Search Hacker News (via Algolia API)
   */
  async searchHackerNews(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://hn.algolia.com/api/v1/search?query=${encodedQuery}&tags=story&hitsPerPage=${limit}`;

      const response = await scraper.fetch(url, true);
      const data = JSON.parse(response);

      for (const hit of data.hits || []) {
        if (hit.url) {
          results.push({
            title: hit.title || '',
            url: hit.url,
            snippet: `Points: ${hit.points || 0}, Comments: ${hit.num_comments || 0}`,
            source: 'hackernews',
          });
        }
      }
    } catch (error) {
      logger.error('Hacker News search error:', error);
    }

    return results;
  }

  /**
   * Search specific site via DuckDuckGo
   */
  async searchSite(site: string, query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchDuckDuckGo({
      query: `site:${site} ${query}`,
      limit,
    });
  }

  /**
   * Search across all tech blog sources
   */
  async searchTechBlogs(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Search dev.to directly
    const devToResults = await this.searchDevTo(query, limitPerSource);
    results.push(...devToResults);

    // Search other sites via DuckDuckGo
    for (const site of SEARCH_SOURCES.techBlogs.filter((s) => s !== 'dev.to')) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        results.push(...siteResults);
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Search HR tech publications
   */
  async searchHRPublications(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const site of SEARCH_SOURCES.hrPublications) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        results.push(...siteResults);
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Search comparison/review sites
   */
  async searchComparisonSites(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const site of SEARCH_SOURCES.comparison) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        results.push(...siteResults);
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }
}

export const customCrawl = new CustomCrawlEngine();

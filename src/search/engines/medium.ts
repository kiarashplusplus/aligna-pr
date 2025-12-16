/**
 * Medium Search Engine
 * Searches Medium publications and articles using multiple strategies
 * Great for finding HR tech, recruiting, and AI content from quality publications
 */

import axios from 'axios';
import { load } from 'cheerio';
import { scraper } from '../scraper';
import { duckduckgoSearch } from './duckduckgo';
import { SearchResult, SearchOptions } from '../../types';
import { logger } from '../../utils';

/** Notable Medium publications for recruiting/HR tech content */
const HR_TECH_PUBLICATIONS = [
  'better-programming',
  'the-startup',
  'towards-data-science',
  'hackernoon',
  'geekculture',
  'javascript-in-plain-english',
  'codeburst',
  'betterprogramming',
];

/** AI and tech focused publications */
const AI_PUBLICATIONS = [
  'towards-data-science',
  'towards-ai',
  'artificial-intelligence',
  'ml-ai-world',
  'syncedreview',
];

/** Business and startup publications */
const BUSINESS_PUBLICATIONS = [
  'the-startup',
  'startup-grind',
  'better-marketing',
  'swlh',
  'entrepreneurshandbook',
];

export class MediumSearchEngine {
  private readonly MEDIUM_BASE = 'https://medium.com';

  /**
   * Medium search is always available (uses web scraping + DuckDuckGo)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Search Medium articles
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    
    // Use DuckDuckGo site search as primary method (most reliable)
    const results = await this.searchViaDuckDuckGo(query, limit);
    
    // If not enough results, supplement with tag search
    if (results.length < limit) {
      const tagResults = await this.searchByTag(query, limit - results.length);
      for (const result of tagResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    logger.debug(`Medium found ${results.length} results for: ${query}`);
    return results.slice(0, limit);
  }

  /**
   * Search Medium via DuckDuckGo site: operator
   */
  async searchViaDuckDuckGo(query: string, limit = 10): Promise<SearchResult[]> {
    const results = await duckduckgoSearch.searchSite('medium.com', query, limit);
    
    // Re-tag results as medium source
    return results.map(r => ({
      ...r,
      source: 'medium',
    }));
  }

  /**
   * Search Medium by tag
   */
  async searchByTag(tag: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
      const url = `${this.MEDIUM_BASE}/tag/${normalizedTag}/latest`;
      const html = await scraper.fetch(url);
      const $ = load(html);

      // Parse article cards
      $('article, [data-post-id], .postArticle').each((_, element) => {
        if (results.length >= limit) return false;

        const articleEl = $(element);
        const titleEl = articleEl.find('h2, h3, .graf--title').first();
        const linkEl = articleEl.find('a[href*="medium.com"], a[data-action="open-post"]').first();
        
        let href = linkEl.attr('href') || '';
        const title = titleEl.text().trim();

        if (title && href) {
          // Normalize Medium URLs
          if (!href.startsWith('http')) {
            href = `${this.MEDIUM_BASE}${href}`;
          }
          
          // Clean up URL (remove query params)
          href = href.split('?')[0];

          if (!results.some(r => r.url === href)) {
            results.push({
              title,
              url: href,
              snippet: articleEl.find('p, .graf--subtitle, .postArticle-content p').first().text().trim().slice(0, 200),
              source: 'medium',
            });
          }
        }
      });
    } catch (error) {
      logger.debug(`Medium tag search failed for ${tag}, using fallback`);
    }

    return results;
  }

  /**
   * Search specific Medium publication
   */
  async searchPublication(publication: string, query: string, limit = 10): Promise<SearchResult[]> {
    // Use DuckDuckGo with site restriction to specific publication
    const pubSlug = publication.toLowerCase().replace(/\s+/g, '-');
    const siteQuery = `site:medium.com/${pubSlug} ${query}`;
    
    const results = await duckduckgoSearch.search({ query: siteQuery, limit });
    
    return results.map(r => ({
      ...r,
      source: 'medium',
      snippet: `${publication} • ${r.snippet}`,
    }));
  }

  /**
   * Search recruiting/HR content across key publications
   */
  async searchRecruiting(limit = 20): Promise<SearchResult[]> {
    const queries = [
      'recruiting automation',
      'AI hiring',
      'candidate screening',
      'interview technology',
      'HR tech tools',
      'talent acquisition AI',
    ];

    const results: SearchResult[] = [];
    const limitPerQuery = Math.ceil(limit / queries.length);

    for (const query of queries) {
      if (results.length >= limit) break;

      const queryResults = await this.searchViaDuckDuckGo(query, limitPerQuery);
      
      for (const result of queryResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search AI/ML content from data science publications
   */
  async searchAI(limit = 20): Promise<SearchResult[]> {
    const queries = [
      'conversational AI',
      'voice AI applications',
      'GPT business applications',
      'AI automation',
      'machine learning recruiting',
    ];

    const results: SearchResult[] = [];
    const limitPerQuery = Math.ceil(limit / queries.length);

    for (const query of queries) {
      if (results.length >= limit) break;

      // Search specifically in AI publications
      for (const pub of AI_PUBLICATIONS.slice(0, 2)) {
        const pubResults = await this.searchPublication(pub, query, Math.ceil(limitPerQuery / 2));
        
        for (const result of pubResults) {
          if (!results.some(r => r.url === result.url)) {
            results.push(result);
          }
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search Better Programming publication
   */
  async searchBetterProgramming(query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchPublication('better-programming', query, limit);
  }

  /**
   * Search The Startup publication
   */
  async searchTheStartup(query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchPublication('swlh', query, limit); // The Startup uses 'swlh' slug
  }

  /**
   * Search Towards Data Science publication
   */
  async searchTowardsDataScience(query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchPublication('towards-data-science', query, limit);
  }

  /**
   * Search HackerNoon (hosted on Medium)
   */
  async searchHackerNoon(query: string, limit = 10): Promise<SearchResult[]> {
    // HackerNoon moved off Medium but still searchable
    const results = await duckduckgoSearch.search({ 
      query: `site:hackernoon.com ${query}`, 
      limit 
    });
    
    return results.map(r => ({
      ...r,
      source: 'medium', // Group with Medium results
    }));
  }

  /**
   * Search across multiple HR tech publications
   */
  async searchHRTechPublications(query: string, limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const limitPerPub = Math.ceil(limit / HR_TECH_PUBLICATIONS.length);

    for (const publication of HR_TECH_PUBLICATIONS) {
      if (results.length >= limit) break;

      try {
        const pubResults = await this.searchPublication(publication, query, limitPerPub);
        
        for (const result of pubResults) {
          if (!results.some(r => r.url === result.url)) {
            results.push(result);
          }
        }
      } catch (error) {
        // Continue with other publications if one fails
        logger.debug(`Failed to search publication ${publication}`);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search across business/startup publications
   */
  async searchBusinessPublications(query: string, limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const limitPerPub = Math.ceil(limit / BUSINESS_PUBLICATIONS.length);

    for (const publication of BUSINESS_PUBLICATIONS) {
      if (results.length >= limit) break;

      try {
        const pubResults = await this.searchPublication(publication, query, limitPerPub);
        
        for (const result of pubResults) {
          if (!results.some(r => r.url === result.url)) {
            results.push(result);
          }
        }
      } catch (error) {
        logger.debug(`Failed to search publication ${publication}`);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get trending articles from a tag
   */
  async getTrending(tag: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');

    try {
      const url = `${this.MEDIUM_BASE}/tag/${normalizedTag}/recommended`;
      const html = await scraper.fetch(url);
      const $ = load(html);

      $('article, [data-post-id]').each((_, element) => {
        if (results.length >= limit) return false;

        const articleEl = $(element);
        const titleEl = articleEl.find('h2, h3').first();
        const linkEl = articleEl.find('a[href*="medium.com"]').first();
        
        let href = linkEl.attr('href') || '';
        const title = titleEl.text().trim();

        if (title && href) {
          if (!href.startsWith('http')) {
            href = `${this.MEDIUM_BASE}${href}`;
          }
          href = href.split('?')[0];

          if (!results.some(r => r.url === href)) {
            results.push({
              title,
              url: href,
              snippet: `Trending in #${tag}`,
              source: 'medium',
            });
          }
        }
      });
    } catch (error) {
      logger.debug(`Medium trending fetch failed for ${tag}`);
    }

    return results;
  }
}

export const mediumSearch = new MediumSearchEngine();

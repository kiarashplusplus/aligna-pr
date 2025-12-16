/**
 * Dev.to Search Engine
 * Uses dev.to's public Forem API - no API key required for read operations
 * Great for developer-focused recruiting content
 */

import axios from 'axios';
import { load } from 'cheerio';
import { scraper } from '../scraper';
import { SearchResult, SearchOptions } from '../../types';
import { logger } from '../../utils';

/** Dev.to article response from API */
interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  tag_list: string[];
  user: {
    name: string;
    username: string;
  };
  reading_time_minutes: number;
  positive_reactions_count: number;
  comments_count: number;
}

/** Relevant tags for recruiting/HR tech content */
const RECRUITING_TAGS = [
  'recruiting',
  'hiring',
  'hr',
  'hrtech',
  'careers',
  'jobs',
  'interview',
  'talentacquisition',
];

const AI_TAGS = [
  'ai',
  'artificialintelligence',
  'machinelearning',
  'ml',
  'openai',
  'gpt',
  'llm',
  'voiceai',
  'conversationalai',
];

const TECH_TAGS = [
  'typescript',
  'nodejs',
  'react',
  'nextjs',
  'livekit',
  'webrtc',
  'azure',
  'startup',
  'saas',
];

export class DevToSearchEngine {
  private readonly API_BASE = 'https://dev.to/api';
  private readonly WEB_BASE = 'https://dev.to';

  /**
   * Dev.to API is always available (no API key needed for read operations)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Search dev.to articles using their API
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    const results: SearchResult[] = [];

    try {
      // Use the articles endpoint with search
      const response = await axios.get(`${this.API_BASE}/articles`, {
        params: {
          per_page: Math.min(limit, 100),
          // Dev.to doesn't have a direct search param in API, use tag or fallback to web search
        },
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      // Filter articles that match the query
      const articles: DevToArticle[] = response.data || [];
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/);

      for (const article of articles) {
        if (results.length >= limit) break;

        const titleLower = article.title.toLowerCase();
        const descLower = (article.description || '').toLowerCase();
        const tags = article.tag_list.map(t => t.toLowerCase());

        // Check if article matches query
        const matchesQuery = queryTerms.some(term =>
          titleLower.includes(term) ||
          descLower.includes(term) ||
          tags.some(tag => tag.includes(term))
        );

        if (matchesQuery) {
          results.push({
            title: article.title,
            url: article.url,
            snippet: article.description || `By ${article.user.name} • ${article.reading_time_minutes} min read`,
            source: 'dev.to',
          });
        }
      }

      // Note: Web scraping fallback disabled - dev.to robots.txt blocks it
      // The API is the primary and reliable method for dev.to search

      logger.debug(`Dev.to found ${results.length} results for: ${query}`);
    } catch (error) {
      logger.warn(`Dev.to API search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Web scraping fallback not available due to robots.txt restrictions
    }

    return results;
  }

  /**
   * Search dev.to by tag (more reliable than text search)
   */
  async searchByTag(tag: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await axios.get(`${this.API_BASE}/articles`, {
        params: {
          tag: tag.toLowerCase().replace(/[^a-z0-9]/g, ''),
          per_page: Math.min(limit, 100),
          top: 30, // Get top articles from last 30 days
        },
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const articles: DevToArticle[] = response.data || [];

      for (const article of articles) {
        if (results.length >= limit) break;

        results.push({
          title: article.title,
          url: article.url,
          snippet: article.description || `By ${article.user.name} • ${article.reading_time_minutes} min read • ${article.positive_reactions_count} reactions`,
          source: 'dev.to',
        });
      }

      logger.debug(`Dev.to tag search found ${results.length} results for tag: ${tag}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Dev.to API error: ${error.response?.status} - ${error.message}`);
      } else {
        logger.error('Dev.to tag search error:', error);
      }
    }

    return results;
  }

  /**
   * Search for recruiting-related content on dev.to
   */
  async searchRecruiting(limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const limitPerTag = Math.ceil(limit / RECRUITING_TAGS.length);

    for (const tag of RECRUITING_TAGS) {
      if (results.length >= limit) break;

      const tagResults = await this.searchByTag(tag, limitPerTag);
      
      // Avoid duplicates by URL
      for (const result of tagResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search for AI-related content on dev.to
   */
  async searchAI(limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const limitPerTag = Math.ceil(limit / AI_TAGS.length);

    for (const tag of AI_TAGS) {
      if (results.length >= limit) break;

      const tagResults = await this.searchByTag(tag, limitPerTag);
      
      for (const result of tagResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search combining recruiting + AI tags for best prospects
   */
  async searchRecruitingAI(limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // First, search for articles that might have both recruiting and AI content
    const combinedTags = ['hiring', 'recruiting', 'interview', 'ai', 'machinelearning'];
    
    for (const tag of combinedTags) {
      const tagResults = await this.searchByTag(tag, 10);
      
      // Filter for articles that mention both recruiting AND AI concepts
      for (const result of tagResults) {
        const titleLower = result.title.toLowerCase();
        const snippetLower = result.snippet.toLowerCase();
        const combined = titleLower + ' ' + snippetLower;

        const hasRecruiting = RECRUITING_TAGS.some(t => combined.includes(t)) ||
          combined.includes('recruit') || combined.includes('hire') || combined.includes('candidate');
        
        const hasAI = AI_TAGS.some(t => combined.includes(t)) ||
          combined.includes('ai') || combined.includes('automat');

        if ((hasRecruiting || hasAI) && !results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }

      if (results.length >= limit) break;
    }

    return results.slice(0, limit);
  }

  /**
   * Fallback web search by scraping dev.to search page
   */
  private async searchWeb(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.WEB_BASE}/search?q=${encodedQuery}`;

      const html = await scraper.fetch(url);
      const $ = load(html);

      // Parse search results from the page
      $('article.crayons-story, .substories article, [data-content-type="article"]').each((_, element) => {
        if (results.length >= limit) return false;

        const titleEl = $(element).find('h2 a, h3 a, .crayons-story__title a').first();
        const href = titleEl.attr('href');
        const title = titleEl.text().trim();

        if (href && title) {
          const fullUrl = href.startsWith('http') ? href : `${this.WEB_BASE}${href}`;
          
          // Avoid duplicates
          if (!results.some(r => r.url === fullUrl)) {
            results.push({
              title,
              url: fullUrl,
              snippet: $(element).find('.crayons-story__tags, .crayons-story__snippet, p').first().text().trim(),
              source: 'dev.to',
            });
          }
        }
      });
    } catch (error) {
      logger.error('Dev.to web search error:', error);
    }

    return results;
  }

  /**
   * Get latest articles (useful for finding fresh content)
   */
  async getLatest(limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await axios.get(`${this.API_BASE}/articles/latest`, {
        params: {
          per_page: Math.min(limit, 100),
        },
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const articles: DevToArticle[] = response.data || [];

      for (const article of articles) {
        results.push({
          title: article.title,
          url: article.url,
          snippet: article.description || `By ${article.user.name} • ${article.reading_time_minutes} min read`,
          source: 'dev.to',
        });
      }
    } catch (error) {
      logger.error('Dev.to latest articles error:', error);
    }

    return results;
  }
}

export const devtoSearch = new DevToSearchEngine();

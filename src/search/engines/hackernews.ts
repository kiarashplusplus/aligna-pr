/**
 * Hacker News Search Engine
 * Uses Algolia's HN Search API - free, no API key required
 * Great for finding discussions about recruiting tools in tech communities
 */

import axios from 'axios';
import { SearchResult, SearchOptions } from '../../types';
import { logger } from '../../utils';

/** Hacker News item from Algolia API */
interface HNItem {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  created_at_i: number;
  story_text: string | null;
  _tags: string[];
}

/** Algolia search response */
interface AlgoliaResponse {
  hits: HNItem[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

/** Search type filters */
type HNSearchType = 'story' | 'comment' | 'poll' | 'job' | 'all';

/** Time range filters */
type HNTimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

export class HackerNewsSearchEngine {
  private readonly API_BASE = 'https://hn.algolia.com/api/v1';
  private readonly HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';

  /**
   * HN Algolia API is always available (no API key needed)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Search Hacker News stories
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    return this.searchStories(query, limit);
  }

  /**
   * Search HN stories (submissions with external URLs)
   */
  async searchStories(query: string, limit = 10, timeRange: HNTimeRange = 'all'): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const params: Record<string, string | number> = {
        query,
        tags: 'story',
        hitsPerPage: Math.min(limit, 100),
      };

      // Add time filter
      if (timeRange !== 'all') {
        params.numericFilters = `created_at_i>${this.getTimestamp(timeRange)}`;
      }

      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search`, {
        params,
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        // Only include stories with external URLs (not Ask HN, Show HN text posts)
        if (hit.url) {
          results.push({
            title: hit.title,
            url: hit.url,
            snippet: this.formatSnippet(hit),
            source: 'hackernews',
          });
        }
      }

      logger.debug(`HN found ${results.length} stories for: ${query}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`HN API error: ${error.response?.status} - ${error.message}`);
      } else {
        logger.error('HN search error:', error);
      }
    }

    return results;
  }

  /**
   * Search by relevance (Algolia's default ranking)
   */
  async searchByRelevance(query: string, limit = 10): Promise<SearchResult[]> {
    return this.searchStories(query, limit);
  }

  /**
   * Search by date (most recent first)
   */
  async searchByDate(query: string, limit = 10, timeRange: HNTimeRange = 'year'): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const params: Record<string, string | number> = {
        query,
        tags: 'story',
        hitsPerPage: Math.min(limit, 100),
      };

      if (timeRange !== 'all') {
        params.numericFilters = `created_at_i>${this.getTimestamp(timeRange)}`;
      }

      // Use search_by_date endpoint for chronological results
      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search_by_date`, {
        params,
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        if (hit.url) {
          results.push({
            title: hit.title,
            url: hit.url,
            snippet: this.formatSnippet(hit),
            source: 'hackernews',
          });
        }
      }

      logger.debug(`HN found ${results.length} recent stories for: ${query}`);
    } catch (error) {
      logger.error('HN search by date error:', error);
    }

    return results;
  }

  /**
   * Search for recruiting-related discussions on HN
   */
  async searchRecruiting(limit = 20): Promise<SearchResult[]> {
    const queries = [
      'recruiting tools',
      'hiring automation',
      'AI recruiting',
      'interview automation',
      'candidate screening',
      'applicant tracking',
    ];

    const results: SearchResult[] = [];
    const limitPerQuery = Math.ceil(limit / queries.length);

    for (const query of queries) {
      if (results.length >= limit) break;

      const queryResults = await this.searchStories(query, limitPerQuery, 'year');
      
      // Avoid duplicates
      for (const result of queryResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search for AI/voice technology discussions
   */
  async searchVoiceAI(limit = 20): Promise<SearchResult[]> {
    const queries = [
      'voice AI',
      'conversational AI',
      'LiveKit',
      'WebRTC voice',
      'Azure OpenAI',
      'GPT voice',
    ];

    const results: SearchResult[] = [];
    const limitPerQuery = Math.ceil(limit / queries.length);

    for (const query of queries) {
      if (results.length >= limit) break;

      const queryResults = await this.searchStories(query, limitPerQuery, 'year');
      
      for (const result of queryResults) {
        if (!results.some(r => r.url === result.url)) {
          results.push(result);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get popular stories (high points) matching query
   */
  async searchPopular(query: string, minPoints = 50, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search`, {
        params: {
          query,
          tags: 'story',
          numericFilters: `points>=${minPoints}`,
          hitsPerPage: Math.min(limit, 100),
        },
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        if (hit.url) {
          results.push({
            title: hit.title,
            url: hit.url,
            snippet: this.formatSnippet(hit),
            source: 'hackernews',
          });
        }
      }

      logger.debug(`HN found ${results.length} popular stories for: ${query}`);
    } catch (error) {
      logger.error('HN popular search error:', error);
    }

    return results;
  }

  /**
   * Search HN comments (useful for finding discussions about specific tools)
   */
  async searchComments(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search`, {
        params: {
          query,
          tags: 'comment',
          hitsPerPage: Math.min(limit, 100),
        },
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        // For comments, link to the HN discussion page
        results.push({
          title: `Comment by ${hit.author}: "${(hit.story_text || '').slice(0, 100)}..."`,
          url: `${this.HN_ITEM_URL}${hit.objectID}`,
          snippet: `Points: ${hit.points || 0} • ${new Date(hit.created_at).toLocaleDateString()}`,
          source: 'hackernews',
        });
      }
    } catch (error) {
      logger.error('HN comment search error:', error);
    }

    return results;
  }

  /**
   * Search "Ask HN" and "Show HN" posts
   */
  async searchShowHN(query: string, limit = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Show HN posts
      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search`, {
        params: {
          query: `Show HN ${query}`,
          tags: 'story',
          hitsPerPage: Math.min(limit, 50),
        },
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        const url = hit.url || `${this.HN_ITEM_URL}${hit.objectID}`;
        results.push({
          title: hit.title,
          url,
          snippet: this.formatSnippet(hit),
          source: 'hackernews',
        });
      }
    } catch (error) {
      logger.error('HN Show HN search error:', error);
    }

    return results;
  }

  /**
   * Get front page stories (current popular items)
   */
  async getFrontPage(limit = 30): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await axios.get<AlgoliaResponse>(`${this.API_BASE}/search`, {
        params: {
          tags: 'front_page',
          hitsPerPage: Math.min(limit, 100),
        },
        timeout: 10000,
      });

      for (const hit of response.data.hits) {
        if (hit.url) {
          results.push({
            title: hit.title,
            url: hit.url,
            snippet: this.formatSnippet(hit),
            source: 'hackernews',
          });
        }
      }
    } catch (error) {
      logger.error('HN front page error:', error);
    }

    return results;
  }

  /**
   * Format snippet with HN metadata
   */
  private formatSnippet(hit: HNItem): string {
    const date = new Date(hit.created_at).toLocaleDateString();
    return `${hit.points || 0} points • ${hit.num_comments || 0} comments • by ${hit.author} • ${date}`;
  }

  /**
   * Get Unix timestamp for time range filter
   */
  private getTimestamp(timeRange: HNTimeRange): number {
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;

    switch (timeRange) {
      case 'day':
        return now - day;
      case 'week':
        return now - 7 * day;
      case 'month':
        return now - 30 * day;
      case 'year':
        return now - 365 * day;
      default:
        return 0;
    }
  }
}

export const hackernewsSearch = new HackerNewsSearchEngine();

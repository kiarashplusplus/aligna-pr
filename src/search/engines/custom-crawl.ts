/**
 * Custom crawl engine for direct site searches
 * Provides site-specific search and aggregation across multiple sources
 * 
 * Note: For dedicated search engines (DuckDuckGo, dev.to, HackerNews, Medium),
 * use the specific engine modules in ./engines/ for more features.
 * This module is for custom site searches and aggregation.
 */

import { duckduckgoSearch } from './duckduckgo';
import { devtoSearch } from './devto';
import { hackernewsSearch } from './hackernews';
import { mediumSearch } from './medium';
import { SearchResult } from '../../types';
import { SEARCH_SOURCES } from '../../config';
import { logger } from '../../utils';

export class CustomCrawlEngine {
  /**
   * Search specific site via DuckDuckGo site: operator
   */
  async searchSite(site: string, query: string, limit = 10): Promise<SearchResult[]> {
    return duckduckgoSearch.searchSite(site, query, limit);
  }

  /**
   * Search across all tech blog sources
   */
  async searchTechBlogs(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Search dev.to using dedicated engine
    try {
      const devToResults = await devtoSearch.search({ query, limit: limitPerSource });
      for (const r of devToResults) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          results.push(r);
        }
      }
    } catch (error) {
      logger.error('Error searching dev.to:', error);
    }

    // Search Medium using dedicated engine
    try {
      const mediumResults = await mediumSearch.search({ query, limit: limitPerSource });
      for (const r of mediumResults) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          results.push(r);
        }
      }
    } catch (error) {
      logger.error('Error searching Medium:', error);
    }

    // Search other sites via DuckDuckGo
    const otherSites = SEARCH_SOURCES.techBlogs.filter(
      (s) => s !== 'dev.to' && s !== 'medium.com'
    );
    
    for (const site of otherSites) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        for (const r of siteResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            results.push(r);
          }
        }
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
    const seenUrls = new Set<string>();

    for (const site of SEARCH_SOURCES.hrPublications) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        for (const r of siteResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            results.push(r);
          }
        }
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Search comparison/review sites (G2, Capterra, etc.)
   */
  async searchComparisonSites(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const site of SEARCH_SOURCES.comparison) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        for (const r of siteResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            results.push(r);
          }
        }
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Search VC and startup blogs
   */
  async searchVCStartupBlogs(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const site of SEARCH_SOURCES.vcStartup) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        for (const r of siteResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            results.push(r);
          }
        }
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Search community sites (Reddit, HN, Indie Hackers)
   */
  async searchCommunities(query: string, limitPerSource = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Use dedicated HN engine
    try {
      const hnResults = await hackernewsSearch.search({ query, limit: limitPerSource });
      for (const r of hnResults) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          results.push(r);
        }
      }
    } catch (error) {
      logger.error('Error searching Hacker News:', error);
    }

    // Search other community sites via DuckDuckGo
    const otherCommunities = SEARCH_SOURCES.communities.filter(
      (s) => s !== 'news.ycombinator.com'
    );

    for (const site of otherCommunities) {
      try {
        const siteResults = await this.searchSite(site, query, limitPerSource);
        for (const r of siteResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            results.push(r);
          }
        }
      } catch (error) {
        logger.error(`Error searching ${site}:`, error);
      }
    }

    return results;
  }

  /**
   * Comprehensive search across all source categories
   */
  async searchAllSources(query: string, limitPerCategory = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    const addResults = (newResults: SearchResult[]) => {
      for (const r of newResults) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          results.push(r);
        }
      }
    };

    // Search all categories in parallel
    const [techBlogs, hrPubs, comparison, vcStartup, communities] = await Promise.allSettled([
      this.searchTechBlogs(query, Math.ceil(limitPerCategory / 3)),
      this.searchHRPublications(query, Math.ceil(limitPerCategory / 3)),
      this.searchComparisonSites(query, Math.ceil(limitPerCategory / 3)),
      this.searchVCStartupBlogs(query, Math.ceil(limitPerCategory / 3)),
      this.searchCommunities(query, Math.ceil(limitPerCategory / 3)),
    ]);

    if (techBlogs.status === 'fulfilled') addResults(techBlogs.value);
    if (hrPubs.status === 'fulfilled') addResults(hrPubs.value);
    if (comparison.status === 'fulfilled') addResults(comparison.value);
    if (vcStartup.status === 'fulfilled') addResults(vcStartup.value);
    if (communities.status === 'fulfilled') addResults(communities.value);

    return results;
  }
}

export const customCrawl = new CustomCrawlEngine();

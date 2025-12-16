/**
 * Unified search interface across all engines
 * Provides a single entry point for searching multiple sources
 * @module search
 */

import { googleSearch } from './engines/google';
import { bingSearch } from './engines/bing';
import { customCrawl } from './engines/custom-crawl';
import { SearchResult, SearchOptions } from '../types';
import { config, SEARCH_QUERIES } from '../config';

/** Available search engine options */
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'devto' | 'hackernews' | 'all';

/** Extended search options for unified search */
export interface UnifiedSearchOptions extends SearchOptions {
  /** Specific engines to use (defaults to 'all') */
  engines?: SearchEngine[];
  /** Specific source domains to search within */
  sources?: string[];
}

/**
 * Deduplicate search results by URL
 * Normalizes URLs to catch duplicates with different protocols/www prefixes
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    // Normalize URL for deduplication
    const normalizedUrl = result.url
      .toLowerCase()
      .replace(/\/$/, '')
      .replace(/^https?:\/\/(www\.)?/, '');

    if (seen.has(normalizedUrl)) {
      return false;
    }
    seen.add(normalizedUrl);
    return true;
  });
}

/**
 * Search across multiple engines and aggregate results
 * 
 * @param options - Search configuration options
 * @param options.query - The search query string
 * @param options.limit - Maximum number of results to return (default: 50)
 * @param options.engines - Array of engines to use, or ['all'] for all available
 * @param options.sources - Specific domains to search within
 * @returns Promise resolving to deduplicated search results
 * 
 * @example
 * ```typescript
 * // Search all engines
 * const results = await search({ query: 'AI recruiting tools' });
 * 
 * // Search specific engines
 * const results = await search({ 
 *   query: 'AI recruiting', 
 *   engines: ['google', 'devto'],
 *   limit: 20 
 * });
 * 
 * // Search specific sites
 * const results = await search({ 
 *   query: 'recruiting', 
 *   sources: ['techcrunch.com', 'dev.to'] 
 * });
 * ```
 */
export async function search(options: UnifiedSearchOptions): Promise<SearchResult[]> {
  const {
    query,
    limit = 50,
    engines = ['all'],
    sources,
  } = options;

  const useAll = engines.includes('all');
  const results: SearchResult[] = [];

  // If specific sources are provided, search them directly
  if (sources && sources.length > 0) {
    for (const source of sources) {
      const sourceResults = await customCrawl.searchSite(source, query, Math.ceil(limit / sources.length));
      results.push(...sourceResults);
    }
    return deduplicateResults(results).slice(0, limit);
  }

  // Search across engines
  const searchPromises: Promise<SearchResult[]>[] = [];

  // Google Search
  if ((useAll || engines.includes('google')) && googleSearch.isConfigured()) {
    searchPromises.push(googleSearch.search({ query, limit: Math.ceil(limit / 2) }));
  }

  // Bing Search
  if ((useAll || engines.includes('bing')) && bingSearch.isConfigured()) {
    searchPromises.push(bingSearch.search({ query, limit: Math.ceil(limit / 2) }));
  }

  // DuckDuckGo (always available)
  if (useAll || engines.includes('duckduckgo')) {
    searchPromises.push(customCrawl.searchDuckDuckGo({ query, limit: Math.ceil(limit / 2) }));
  }

  // dev.to
  if (useAll || engines.includes('devto')) {
    searchPromises.push(customCrawl.searchDevTo(query, Math.ceil(limit / 4)));
  }

  // Hacker News
  if (useAll || engines.includes('hackernews')) {
    searchPromises.push(customCrawl.searchHackerNews(query, Math.ceil(limit / 4)));
  }

  // Wait for all searches to complete
  const searchResults = await Promise.allSettled(searchPromises);

  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    } else {
      console.error('Search engine error:', result.reason);
    }
  }

  return deduplicateResults(results).slice(0, limit);
}

/**
 * Search with predefined query categories
 */
export async function searchByCategory(
  category: keyof typeof SEARCH_QUERIES,
  options: Partial<UnifiedSearchOptions> = {}
): Promise<SearchResult[]> {
  const queries = SEARCH_QUERIES[category];
  const results: SearchResult[] = [];
  const limitPerQuery = Math.ceil((options.limit || 50) / queries.length);

  for (const query of queries) {
    if (config.verbose) {
      console.log(`Searching: "${query}"...`);
    }

    const queryResults = await search({
      ...options,
      query,
      limit: limitPerQuery,
    });

    results.push(...queryResults);
  }

  return deduplicateResults(results).slice(0, options.limit || 100);
}

/**
 * Comprehensive search across all categories
 */
export async function comprehensiveSearch(
  options: Partial<UnifiedSearchOptions> = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const categories = Object.keys(SEARCH_QUERIES) as (keyof typeof SEARCH_QUERIES)[];
  const limitPerCategory = Math.ceil((options.limit || 200) / categories.length);

  for (const category of categories) {
    if (config.verbose) {
      console.log(`\nSearching category: ${category}...`);
    }

    const categoryResults = await searchByCategory(category, {
      ...options,
      limit: limitPerCategory,
    });

    results.push(...categoryResults);
  }

  return deduplicateResults(results).slice(0, options.limit || 200);
}

// Re-export engines
export { googleSearch } from './engines/google';
export { bingSearch } from './engines/bing';
export { customCrawl } from './engines/custom-crawl';
export { scraper } from './scraper';

/**
 * Main prospecting engine
 */

import { v4 as uuidv4 } from 'uuid';
import { search, comprehensiveSearch, scraper, SearchEngine } from './search';
import { extractArticle, mentionsAligna } from './search/parsers/article-extractor';
import { extractAuthorFromHtml } from './search/parsers/author-extractor';
import { calculateScore, getPriority } from './scoring';
import { generateOutreachRecommendation } from './outreach';
import { getDatabase } from './storage';
import { Article, AuthorContact, Prospect, ProspectingResult, SearchResult } from './types';
import { config } from './config';

export interface ProspectingOptions {
  queries?: string[];
  engines?: SearchEngine[];
  sources?: string[];
  limit?: number;
  minScore?: number;
  skipExisting?: boolean;
  verbose?: boolean;
}

/**
 * Process a single search result into a prospect
 */
async function processSearchResult(
  result: SearchResult,
  verbose: boolean
): Promise<Prospect | null> {
  try {
    if (verbose) {
      console.log(`  Processing: ${result.title.slice(0, 60)}...`);
    }

    // Fetch and extract article content
    const html = await scraper.fetch(result.url);
    const article = await extractArticle(result.url);

    if (!article) {
      if (verbose) {
        console.log(`    ⚠️ Could not extract article content`);
      }
      return null;
    }

    // Skip if Aligna is already mentioned
    if (mentionsAligna(article.fullText)) {
      if (verbose) {
        console.log(`    ⏭️ Skipping - Aligna already mentioned`);
      }
      return null;
    }

    // Extract author information
    const author = extractAuthorFromHtml(html, result.url);

    // Calculate score
    const { score, breakdown } = calculateScore(article, author);
    const priority = getPriority(score);

    // Generate outreach recommendation
    const outreach = generateOutreachRecommendation(article, author, score);

    // Create prospect
    const prospect: Prospect = {
      id: uuidv4(),
      article,
      author,
      score,
      scoreBreakdown: breakdown,
      priority,
      outreach,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (verbose) {
      console.log(`    ✅ Score: ${score} (${priority})`);
    }

    return prospect;
  } catch (error) {
    if (verbose) {
      console.error(`    ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return null;
  }
}

/**
 * Run the prospecting engine
 */
export async function runProspecting(options: ProspectingOptions = {}): Promise<ProspectingResult> {
  const startTime = Date.now();
  const {
    queries,
    engines,
    sources,
    limit = 100,
    minScore = config.minScore,
    skipExisting = true,
    verbose = config.verbose,
  } = options;

  const db = await getDatabase();
  const prospects: Prospect[] = [];
  let totalFound = 0;

  if (verbose) {
    console.log('\n🔍 Starting Aligna PR Prospecting...\n');
  }

  // Determine search strategy
  let searchResults: SearchResult[];

  if (queries && queries.length > 0) {
    // Search with specific queries
    if (verbose) {
      console.log(`📋 Searching with ${queries.length} custom queries...\n`);
    }

    searchResults = [];
    for (const query of queries) {
      if (verbose) {
        console.log(`  Query: "${query}"`);
      }
      const results = await search({
        query,
        limit: Math.ceil(limit / queries.length),
        engines,
      });
      searchResults.push(...results);
    }
  } else {
    // Use comprehensive search
    if (verbose) {
      console.log('📋 Running comprehensive search across all categories...\n');
    }
    searchResults = await comprehensiveSearch({ limit, engines });
  }

  totalFound = searchResults.length;

  if (verbose) {
    console.log(`\n📊 Found ${totalFound} articles to analyze\n`);
  }

  // Process each result
  let processed = 0;
  let skipped = 0;

  for (const result of searchResults) {
    // Check if URL already exists in database
    if (skipExisting && db.hasUrl(result.url)) {
      skipped++;
      continue;
    }

    const prospect = await processSearchResult(result, verbose);

    if (prospect && prospect.score >= minScore) {
      prospects.push(prospect);
      db.saveProspect(prospect);
    }

    processed++;

    // Progress indicator
    if (verbose && processed % 10 === 0) {
      console.log(`  Progress: ${processed}/${totalFound - skipped} articles processed`);
    }
  }

  // Sort by score
  prospects.sort((a, b) => b.score - a.score);

  // Calculate statistics
  const avgScore =
    prospects.length > 0
      ? prospects.reduce((sum, p) => sum + p.score, 0) / prospects.length
      : 0;

  const highPriorityCount = prospects.filter((p) => p.score >= 60).length;

  const result: ProspectingResult = {
    metadata: {
      searchDate: new Date(),
      queries: queries || ['comprehensive'],
      totalArticlesFound: totalFound,
      totalArticlesScored: prospects.length,
      averageScore: Math.round(avgScore * 10) / 10,
      highPriorityCount,
      processingTimeMs: Date.now() - startTime,
    },
    prospects,
  };

  if (verbose) {
    console.log('\n✨ Prospecting Complete!\n');
    console.log(`  Total Found: ${totalFound}`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Skipped (existing): ${skipped}`);
    console.log(`  Qualified (min score ${minScore}): ${prospects.length}`);
    console.log(`  High Priority (60+): ${highPriorityCount}`);
    console.log(`  Average Score: ${avgScore.toFixed(1)}`);
    console.log(`  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  }

  return result;
}

/**
 * Quick search for testing
 */
export async function quickSearch(
  query: string,
  limit = 10
): Promise<ProspectingResult> {
  return runProspecting({
    queries: [query],
    limit,
    verbose: true,
  });
}

// Export types and utilities
export * from './types';
export * from './config';
export * from './search';
export * from './scoring';
export * from './outreach';
export * from './storage';

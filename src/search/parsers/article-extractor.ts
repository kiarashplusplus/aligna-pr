/**
 * Article content extractor using Readability and Cheerio
 */

import { load, CheerioAPI } from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { scraper } from '../scraper';
import { Article, ContentType } from '../../types';
import { ALIGNA, TOPIC_KEYWORDS } from '../../config';
import { logger } from '../../utils';

/**
 * Extract clean article content from a URL
 */
export async function extractArticle(url: string): Promise<Article | null> {
  try {
    const html = await scraper.fetch(url);
    return parseArticleHtml(url, html);
  } catch (error) {
    logger.error(`Failed to extract article from ${url}:`, error);
    return null;
  }
}

/**
 * Parse article from HTML string
 */
export function parseArticleHtml(url: string, html: string): Article | null {
  try {
    const $ = load(html);
    const domain = new URL(url).hostname;

    // Use Readability to extract main content
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const readable = reader.parse();

    if (!readable) {
      return null;
    }

    // Extract additional metadata using Cheerio
    const title = extractTitle($) || readable.title;
    const fullText = readable.textContent;
    const excerpt = extractExcerpt(fullText);
    const wordCount = countWords(fullText);

    // Extract dates
    const publishDate = extractPublishDate($);
    const lastUpdated = extractLastUpdated($);

    // Extract publication name
    const publicationName = extractPublicationName($, domain);

    // Detect topics and content type
    const detectedTopics = detectTopics(fullText, title);
    const contentType = detectContentType(fullText, title);

    // Check for product mentions
    const mentionsProducts = checkMentionsProducts(fullText);
    const mentionsCompetitors = findCompetitorMentions(fullText);

    return {
      title,
      url,
      publicationName,
      publishDate,
      lastUpdated,
      fullText,
      excerpt,
      wordCount,
      detectedTopics,
      contentType,
      mentionsProducts,
      mentionsCompetitors,
      domain,
    };
  } catch (error) {
    logger.error(`Failed to parse article HTML:`, error);
    return null;
  }
}

/**
 * Extract title from various sources
 */
function extractTitle($: CheerioAPI): string {
  // Try different title sources in order of preference
  const titleSources = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'),
    $('h1.post-title, h1.article-title, h1.entry-title').first().text(),
    $('h1').first().text(),
    $('title').text(),
  ];

  for (const title of titleSources) {
    const cleaned = title?.trim();
    if (cleaned && cleaned.length > 0) {
      return cleaned;
    }
  }

  return 'Untitled';
}

/**
 * Extract first 200 characters as excerpt
 */
function extractExcerpt(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 200) {
    return cleaned;
  }
  return cleaned.slice(0, 197) + '...';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Extract publish date
 */
function extractPublishDate($: CheerioAPI): Date | null {
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="publication_date"]',
    'meta[name="date"]',
    'time[datetime]',
    '.post-date',
    '.published',
    '.entry-date',
  ];

  for (const selector of dateSelectors) {
    const element = $(selector).first();
    const dateStr =
      element.attr('content') || element.attr('datetime') || element.text();

    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extract last updated date
 */
function extractLastUpdated($: CheerioAPI): Date | null {
  const dateSelectors = [
    'meta[property="article:modified_time"]',
    'meta[name="last-modified"]',
    '.updated',
    '.modified-date',
  ];

  for (const selector of dateSelectors) {
    const element = $(selector).first();
    const dateStr =
      element.attr('content') || element.attr('datetime') || element.text();

    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Check for "Last updated:" text in content
  const bodyText = $('body').text();
  const updateMatch = bodyText.match(
    /(?:last\s+)?updated[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i
  );
  if (updateMatch) {
    const parsed = new Date(updateMatch[1]);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Extract publication name
 */
function extractPublicationName($: CheerioAPI, domain: string): string {
  const sources = [
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[name="application-name"]').attr('content'),
    $('.site-title, .blog-title').first().text(),
  ];

  for (const name of sources) {
    const cleaned = name?.trim();
    if (cleaned && cleaned.length > 0) {
      return cleaned;
    }
  }

  // Fall back to domain name
  return domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co)$/, '')
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detect topics based on keywords
 */
function detectTopics(text: string, title: string): string[] {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hasKeyword = keywords.some(
      (kw) => lowerText.includes(kw) || lowerTitle.includes(kw)
    );
    if (hasKeyword) {
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Detect content type based on structure and keywords
 */
function detectContentType(text: string, title: string): ContentType {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Listicle patterns
  const listiclePatterns = [
    /\b\d+\s+(best|top|tools|tips|ways|alternatives)/i,
    /\btop\s+\d+/i,
    /\bbest\s+\d+/i,
    /\blist\s+of\s+/i,
  ];
  if (listiclePatterns.some((p) => p.test(lowerTitle) || p.test(lowerText.slice(0, 500)))) {
    return 'listicle';
  }

  // Comparison patterns
  const comparisonPatterns = [
    /\bvs\.?\b/i,
    /\bversus\b/i,
    /\bcompar/i,
    /\balternatives?\s+to\b/i,
  ];
  if (comparisonPatterns.some((p) => p.test(lowerTitle))) {
    return 'comparison';
  }

  // Guide patterns
  const guidePatterns = [
    /\bguide\b/i,
    /\bhow\s+to\b/i,
    /\bcomplete\b/i,
    /\bultimate\b/i,
    /\bcomprehensive\b/i,
  ];
  if (guidePatterns.some((p) => p.test(lowerTitle))) {
    return 'guide';
  }

  // Case study patterns
  const caseStudyPatterns = [/\bcase\s+study\b/i, /\bsuccess\s+story\b/i, /\bhow\s+\w+\s+achieved\b/i];
  if (caseStudyPatterns.some((p) => p.test(lowerTitle) || p.test(lowerText.slice(0, 500)))) {
    return 'case-study';
  }

  // Tutorial patterns
  const tutorialPatterns = [/\btutorial\b/i, /\bstep[- ]by[- ]step\b/i, /\bwalkthrough\b/i];
  if (tutorialPatterns.some((p) => p.test(lowerTitle))) {
    return 'tutorial';
  }

  // News patterns
  const newsPatterns = [/\bannounces?\b/i, /\blaunches?\b/i, /\braises?\s+\$/i, /\bfunding\b/i];
  if (newsPatterns.some((p) => p.test(lowerTitle))) {
    return 'news';
  }

  // Default to opinion
  return 'opinion';
}

/**
 * Check if article mentions specific product/tool names
 */
function checkMentionsProducts(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Look for product naming patterns
  const productPatterns = [
    /\b[A-Z][a-z]+(?:\.(?:io|ai|com|co|app))?\b/, // PascalCase names
    /pricing|plans|subscription|free tier|trial/i,
    /\$\d+(?:\/mo(?:nth)?)?/i, // Price mentions
    /sign up|get started|try\s+\w+/i,
  ];

  // Also check for competitor mentions
  const mentionsCompetitors = ALIGNA.competitors.some((comp) =>
    lowerText.includes(comp.toLowerCase())
  );

  return (
    mentionsCompetitors ||
    productPatterns.some((p) => p.test(text) || p.test(lowerText))
  );
}

/**
 * Find which competitors are mentioned
 */
function findCompetitorMentions(text: string): string[] {
  const lowerText = text.toLowerCase();
  return ALIGNA.competitors.filter((comp) => lowerText.includes(comp.toLowerCase()));
}

/**
 * Check if article already mentions Aligna
 */
export function mentionsAligna(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes('aligna') || lowerText.includes('align-a');
}

/**
 * Check for update-friendly signals
 */
export function hasUpdateSignals(text: string): boolean {
  const lowerText = text.toLowerCase();

  const updateSignals = [
    /last updated/i,
    /updated:/i,
    /we'll update this/i,
    /let us know if we missed/i,
    /suggest\s+\w+\s+tool/i,
    /comment below/i,
    /share\s+your\s+favorites/i,
  ];

  return updateSignals.some((pattern) => pattern.test(lowerText));
}

export { extractArticle as default };

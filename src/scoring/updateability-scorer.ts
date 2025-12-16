/**
 * Updateability scoring (0-20 points)
 */

import { Article } from '../types';

/**
 * Score how likely the article is to be updated (0-20 points)
 */
export function scoreUpdateability(article: Article): number {
  let score = 0;
  const text = article.fullText.toLowerCase();

  // Explicit update signals (0-10 points)
  score += scoreUpdateSignals(text);

  // Content type bonus (0-10 points)
  score += scoreContentTypeForUpdate(article.contentType);

  // Freshness indicator (0-5 points)
  score += scoreFreshness(article.publishDate, article.lastUpdated);

  // Penalty for very old, never-updated content
  if (article.publishDate) {
    const monthsSincePublish = getMonthsSince(article.publishDate);
    if (monthsSincePublish > 36 && !article.lastUpdated) {
      score = Math.max(0, score - 10);
    }
  }

  return Math.min(score, 20);
}

/**
 * Score based on update signals in text
 */
function scoreUpdateSignals(text: string): number {
  let score = 0;

  // Check for explicit "last updated" text
  if (/last\s+updated/i.test(text)) {
    score += 5;
  }

  // Check for recent update dates in text
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1];
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  for (const year of recentYears) {
    const yearPattern = new RegExp(`updated[:\\s]+(${months.join('|')})\\s+\\d{1,2},?\\s+${year}`, 'i');
    if (yearPattern.test(text)) {
      score += 5;
      break;
    }
  }

  // Check for update-friendly language
  const updateFriendlyPatterns = [
    /we'll\s+update\s+this/i,
    /we\s+will\s+keep\s+this\s+updated/i,
    /periodically\s+updated/i,
    /regularly\s+updated/i,
    /let\s+us\s+know\s+if\s+we\s+missed/i,
    /suggest\s+a\s+tool/i,
    /submit\s+a\s+tool/i,
    /leave\s+a\s+comment/i,
    /share\s+your\s+favorites?/i,
  ];

  for (const pattern of updateFriendlyPatterns) {
    if (pattern.test(text)) {
      score += 3;
      break;
    }
  }

  return Math.min(score, 10);
}

/**
 * Score content type for update likelihood
 */
function scoreContentTypeForUpdate(contentType: string): number {
  switch (contentType) {
    case 'comparison':
      return 9; // Comparisons are frequently updated
    case 'listicle':
      return 8; // Lists are update-friendly
    case 'guide':
      return 7; // Guides often get updated
    case 'tutorial':
      return 4; // Tutorials less often updated
    case 'case-study':
      return 2; // Case studies rarely updated
    case 'news':
      return 1; // News is dated
    case 'opinion':
      return 2; // Opinions rarely updated
    default:
      return 3;
  }
}

/**
 * Score freshness of the article
 */
function scoreFreshness(publishDate: Date | null, lastUpdated: Date | null): number {
  // Use last updated if available, otherwise publish date
  const referenceDate = lastUpdated || publishDate;

  if (!referenceDate) {
    return 0; // Unknown date, no bonus
  }

  const monthsSince = getMonthsSince(referenceDate);

  if (monthsSince < 3) return 5;
  if (monthsSince < 6) return 4;
  if (monthsSince < 12) return 3;
  if (monthsSince < 18) return 2;
  if (monthsSince < 24) return 1;
  return 0;
}

/**
 * Calculate months since a date
 */
function getMonthsSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 30);
}

/**
 * Get updateability level description
 */
export function getUpdateabilityLevel(score: number): string {
  if (score >= 16) return 'Highly likely to be updated - active maintenance signals';
  if (score >= 12) return 'Likely to accept updates - fresh, list-type content';
  if (score >= 8) return 'Moderate update potential - content type supports updates';
  if (score >= 4) return 'Low update likelihood - dated or static content type';
  return 'Unlikely to be updated - old or static content';
}

/**
 * Article quality scoring (0-20 points)
 */

import { Article } from '../types';
import { SCORING_CONFIG, PUBLICATION_TIERS } from '../config';

/**
 * Score article quality (0-20 points)
 */
export function scoreArticleQuality(article: Article): number {
  let score = 0;

  // Word count (0-8 points)
  score += scoreWordCount(article.wordCount);

  // Content type (0-7 points)
  score += scoreContentType(article.contentType);

  // Product mentions (0-5 points)
  if (article.mentionsProducts) {
    score += 5;
  }

  return Math.min(score, 20);
}

/**
 * Score based on word count (uses configurable thresholds)
 */
function scoreWordCount(wordCount: number): number {
  for (const threshold of SCORING_CONFIG.wordCountThresholds) {
    if (wordCount >= threshold.min) {
      return threshold.points;
    }
  }
  return 2;
}

/**
 * Score based on content type (uses configurable scores)
 */
function scoreContentType(contentType: string): number {
  return SCORING_CONFIG.contentTypeScores[contentType] ?? SCORING_CONFIG.contentTypeScores.default;
}

/**
 * Score publication authority (bonus scoring, not included in main 20 points)
 * Can be used for additional weighting or filtering
 */
export function scorePublicationAuthority(publicationName: string): number {
  const pubLower = publicationName.toLowerCase();

  if (PUBLICATION_TIERS.major.some((p) => pubLower.includes(p))) {
    return 10;
  }

  if (PUBLICATION_TIERS.hrTech.some((p) => pubLower.includes(p))) {
    return 8;
  }

  if (PUBLICATION_TIERS.techBlogs.some((p) => pubLower.includes(p))) {
    return 6;
  }

  // Domain authority estimate based on name recognition
  return 3;
}

/**
 * Get quality level description
 */
export function getQualityLevel(score: number): string {
  if (score >= 18) return 'Excellent quality - comprehensive, product-focused content';
  if (score >= 14) return 'High quality - detailed guide or comparison';
  if (score >= 10) return 'Good quality - solid content with useful depth';
  if (score >= 6) return 'Moderate quality - basic but useful content';
  return 'Limited quality - short or generic content';
}

/**
 * Article quality scoring (0-20 points)
 */

import { Article } from '../types';

// Publication authority tiers
const MAJOR_PUBLICATIONS = [
  'techcrunch',
  'forbes',
  'wired',
  'venturebeat',
  'theverge',
  'mashable',
  'hbr',
  'harvard business review',
  'mit technology review',
  'fast company',
  'inc.com',
];

const QUALITY_TECH_BLOGS = [
  'medium',
  'dev.to',
  'hackernoon',
  'towards data science',
  'better programming',
  'freecodecamp',
  'smashing magazine',
];

const HR_TECH_PUBLICATIONS = [
  'hrtechnologist',
  'hr technologist',
  'recruiting daily',
  'recruitingdaily',
  'ere',
  'tlnt',
  'hrdive',
  'hr dive',
  'shrm',
  'g2',
  'capterra',
  'software advice',
];

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
 * Score based on word count
 */
function scoreWordCount(wordCount: number): number {
  if (wordCount >= 2500) return 8;
  if (wordCount >= 1800) return 7;
  if (wordCount >= 1500) return 6;
  if (wordCount >= 1000) return 5;
  if (wordCount >= 800) return 4;
  if (wordCount >= 500) return 3;
  return 2;
}

/**
 * Score based on content type
 */
function scoreContentType(contentType: string): number {
  switch (contentType) {
    case 'guide':
      return 7;
    case 'comparison':
      return 7;
    case 'listicle':
      return 6;
    case 'case-study':
      return 5;
    case 'tutorial':
      return 5;
    case 'news':
      return 4;
    case 'opinion':
      return 3;
    default:
      return 3;
  }
}

/**
 * Score publication authority (bonus scoring, not included in main 20 points)
 */
export function scorePublicationAuthority(publicationName: string): number {
  const pubLower = publicationName.toLowerCase();

  if (MAJOR_PUBLICATIONS.some((p) => pubLower.includes(p))) {
    return 10;
  }

  if (HR_TECH_PUBLICATIONS.some((p) => pubLower.includes(p))) {
    return 8;
  }

  if (QUALITY_TECH_BLOGS.some((p) => pubLower.includes(p))) {
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

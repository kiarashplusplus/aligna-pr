/**
 * Complete scoring system for prospects
 */

import { Article, AuthorContact, ScoringFactors, Priority } from '../types';
import { scoreTopicalRelevance, getRelevanceLevel } from './relevance-scorer';
import { scoreArticleQuality, getQualityLevel } from './quality-scorer';
import { scoreUpdateability, getUpdateabilityLevel } from './updateability-scorer';
import { ALIGNA } from '../config';

/**
 * Score author credibility (0-15 points)
 */
export function scoreAuthorCredibility(author: AuthorContact, article: Article): number {
  let score = 0;

  // Author type (0-8 points)
  if (author.isFreelance) {
    score += 8; // Freelancers are more flexible and receptive
  } else if (author.isEditor) {
    score += 4; // Editors have power but are less flexible
  } else {
    score += 6; // Staff writers are middle ground
  }

  // Subject matter expertise (0-4 points)
  const bio = (author.bio || '').toLowerCase();
  const title = (author.title || '').toLowerCase();

  if (
    bio.includes('hr tech') ||
    bio.includes('recruiting') ||
    bio.includes('talent') ||
    title.includes('hr') ||
    title.includes('recruiting')
  ) {
    score += 4;
  } else if (
    bio.includes('tech') ||
    bio.includes('ai') ||
    bio.includes('software') ||
    title.includes('tech')
  ) {
    score += 3;
  } else if (
    bio.includes('writer') ||
    bio.includes('journalist') ||
    bio.includes('editor')
  ) {
    score += 2;
  }

  // Publication quality (0-3 points)
  const majorPubs = [
    'techcrunch',
    'medium',
    'dev.to',
    'hackernews',
    'forbes',
    'venture beat',
    'hrtechnologist',
  ];
  if (majorPubs.some((pub) => article.publicationName.toLowerCase().includes(pub))) {
    score += 3;
  } else {
    score += 1;
  }

  return Math.min(score, 15);
}

/**
 * Score competitive gap (0-10 points)
 */
export function scoreCompetitiveGap(article: Article): number {
  const text = article.fullText.toLowerCase();

  // Check if Aligna is already mentioned
  const mentionsAligna = text.includes('aligna') || text.includes('align-a');
  if (mentionsAligna) {
    return 0; // Already mentioned, no gap opportunity
  }

  // Check for competitor mentions
  const mentionsCompetitor = ALIGNA.competitors.some((comp) =>
    text.includes(comp.toLowerCase())
  );

  if (mentionsCompetitor) {
    return 10; // Mentions competitors but not Aligna - excellent opportunity
  }

  // Content type bonuses even without competitor mentions
  if (article.contentType === 'comparison') {
    return 8; // Comparison articles are perfect for additions
  }

  if (article.mentionsProducts) {
    return 5; // Mentions products in general
  }

  if (article.contentType === 'listicle') {
    return 4; // Lists are good for additions
  }

  return 2; // General opportunity
}

/**
 * Score reachability (0-5 points)
 */
export function scoreReachability(author: AuthorContact): number {
  if (author.publicEmail) return 5;
  if (author.contactFormUrl) return 4;
  if (author.linkedInUrl) return 3;
  if (author.twitterHandle) return 2;
  return 0; // Unknown contact method
}

/**
 * Calculate complete score with breakdown
 */
export function calculateScore(
  article: Article,
  author: AuthorContact
): { score: number; breakdown: ScoringFactors } {
  const breakdown: ScoringFactors = {
    topicalRelevance: scoreTopicalRelevance(article),
    articleQuality: scoreArticleQuality(article),
    updateability: scoreUpdateability(article),
    authorCredibility: scoreAuthorCredibility(author, article),
    competitiveGap: scoreCompetitiveGap(article),
    reachability: scoreReachability(author),
  };

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return { score, breakdown };
}

/**
 * Determine priority level based on score
 */
export function getPriority(score: number): Priority {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'weak';
  return 'skip';
}

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority: Priority): string {
  switch (priority) {
    case 'excellent':
      return '🔥';
    case 'strong':
      return '✅';
    case 'moderate':
      return '🤔';
    case 'weak':
      return '🤷';
    case 'skip':
      return '❌';
  }
}

/**
 * Get human-readable score breakdown
 */
export function getScoreExplanation(breakdown: ScoringFactors): string {
  const explanations: string[] = [];

  explanations.push(
    `• Topical Relevance: ${breakdown.topicalRelevance}/30 - ${getRelevanceLevel(breakdown.topicalRelevance)}`
  );
  explanations.push(
    `• Article Quality: ${breakdown.articleQuality}/20 - ${getQualityLevel(breakdown.articleQuality)}`
  );
  explanations.push(
    `• Updateability: ${breakdown.updateability}/20 - ${getUpdateabilityLevel(breakdown.updateability)}`
  );
  explanations.push(
    `• Author Credibility: ${breakdown.authorCredibility}/15`
  );
  explanations.push(
    `• Competitive Gap: ${breakdown.competitiveGap}/10${breakdown.competitiveGap >= 8 ? ' (mentions competitors but not Aligna!)' : ''}`
  );
  explanations.push(
    `• Reachability: ${breakdown.reachability}/5`
  );

  return explanations.join('\n');
}

// Re-export individual scorers
export { scoreTopicalRelevance } from './relevance-scorer';
export { scoreArticleQuality } from './quality-scorer';
export { scoreUpdateability } from './updateability-scorer';

/**
 * Topical relevance scoring (0-30 points)
 */

import { Article } from '../types';

// Perfect match keywords (25-30 points if found)
const PERFECT_KEYWORDS = [
  'conversational ai interview',
  'voice ai recruiting',
  'live ai phone screen',
  'real-time ai interview',
  'livekit',
  'ai phone screening',
  'voice-first recruiting',
  'live voice interview',
  'phone ai interview',
  'conversational recruiter',
];

// Strong match keywords (18-24 points if found)
const STRONG_KEYWORDS = [
  'candidate screening ai',
  'interview automation',
  'hirevue alternative',
  'async video alternative',
  'ai recruiter',
  'automated phone screen',
  'phone screen automation',
  'video interview alternative',
  'ai-powered screening',
  'intelligent recruiting',
  'ai assessment tool',
];

// Moderate match keywords (12-17 points)
const MODERATE_KEYWORDS = [
  'recruiting automation',
  'hr tech',
  'talent acquisition',
  'applicant tracking',
  'candidate assessment',
  'interview platform',
  'hiring automation',
  'recruiting tool',
  'technical recruiting',
];

/**
 * Score topical relevance (0-30 points)
 */
export function scoreTopicalRelevance(article: Article): number {
  const text = article.fullText.toLowerCase();
  const title = article.title.toLowerCase();
  let score = 0;

  // Check perfect match keywords
  for (const keyword of PERFECT_KEYWORDS) {
    if (title.includes(keyword)) {
      score = Math.max(score, 30); // Title match = max score
      break;
    }
    if (text.includes(keyword)) {
      score = Math.max(score, 25);
    }
  }

  if (score >= 25) {
    return Math.min(score, 30);
  }

  // Check strong match keywords
  for (const keyword of STRONG_KEYWORDS) {
    if (title.includes(keyword)) {
      score = Math.max(score, 22);
      break;
    }
    if (text.includes(keyword)) {
      score = Math.max(score, 18);
    }
  }

  if (score >= 18) {
    return Math.min(score, 30);
  }

  // Check moderate match keywords
  for (const keyword of MODERATE_KEYWORDS) {
    if (title.includes(keyword)) {
      score = Math.max(score, 15);
      break;
    }
    if (text.includes(keyword)) {
      score = Math.max(score, 12);
    }
  }

  if (score >= 12) {
    return Math.min(score, 30);
  }

  // Check detected topics
  if (article.detectedTopics.includes('voice-ai')) {
    score = Math.max(score, 15);
  } else if (article.detectedTopics.includes('interview-automation')) {
    score = Math.max(score, 13);
  } else if (article.detectedTopics.includes('candidate-screening')) {
    score = Math.max(score, 12);
  } else if (article.detectedTopics.includes('hr-tech')) {
    score = Math.max(score, 8);
  }

  // Bonus for multiple relevant topics
  const relevantTopics = article.detectedTopics.filter((t) =>
    ['voice-ai', 'candidate-screening', 'hr-tech', 'interview-automation'].includes(t)
  );
  if (relevantTopics.length >= 3) {
    score += 3;
  } else if (relevantTopics.length >= 2) {
    score += 2;
  }

  return Math.min(score, 30);
}

/**
 * Get relevance level description
 */
export function getRelevanceLevel(score: number): string {
  if (score >= 25) return 'Perfect match - explicitly discusses voice/conversational AI in recruiting';
  if (score >= 18) return 'Strong match - covers AI-powered candidate screening';
  if (score >= 12) return 'Moderate match - discusses recruiting automation or HR tech';
  if (score >= 5) return 'Weak match - tangentially related to recruiting technology';
  return 'Minimal relevance - general content';
}

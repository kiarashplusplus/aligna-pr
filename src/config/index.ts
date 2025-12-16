/**
 * Configuration loader with environment variable support
 */

import dotenv from 'dotenv';
import path from 'path';
import { Config } from '../types';

// Load environment variables
dotenv.config();

export function loadConfig(): Config {
  return {
    // API Keys
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    bingSearchApiKey: process.env.BING_SEARCH_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,

    // Storage
    databasePath: process.env.DATABASE_PATH || './data/prospects.db',

    // Scraping
    maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '100', 10),
    minDelayBetweenRequests: parseInt(process.env.MIN_DELAY_BETWEEN_REQUESTS || '2000', 10),
    userAgent:
      process.env.USER_AGENT ||
      'AlignaPRBot/1.0 (+https://www.align-a.com; contact@align-a.com)',

    // Output
    outputFormat: (process.env.OUTPUT_FORMAT as 'json' | 'csv' | 'both') || 'both',
    outputPath: process.env.OUTPUT_PATH || './output/',

    // Application
    minScore: parseInt(process.env.MIN_SCORE || '40', 10),
    maxArticlesPerQuery: parseInt(process.env.MAX_ARTICLES_PER_QUERY || '50', 10),
    verbose: process.env.VERBOSE === 'true',
  };
}

export const config = loadConfig();

/**
 * Aligna-specific constants
 */
export const ALIGNA = {
  name: 'Aligna',
  url: 'https://www.align-a.com',
  founder: {
    name: 'Kiarash Adl',
    email: 'kiarasha@alum.mit.edu',
    credentials: 'MIT alum',
  },
  technology: {
    backend: 'TypeScript/Node.js with Express, Prisma ORM, PostgreSQL',
    frontend: 'Next.js 16, React',
    voice: 'LiveKit for real-time WebRTC',
    ai: 'Azure OpenAI (STT, TTS, GPT-5)',
  },
  differentiators: [
    'Real-time AI phone conversations (not pre-recorded video responses)',
    'Built on LiveKit + Azure OpenAI for voice-first candidate experience',
    'Eliminates scheduling complexity - candidates just call a number',
    'Dual-sided platform: candidates AND employers interact via AI voice',
  ],
  competitors: [
    'hirevue',
    'modern hire',
    'modernhire',
    'karat',
    'willo',
    'spark hire',
    'sparkhire',
    'myinterview',
    'vidcruiter',
    'hireflix',
  ],
};

/**
 * Search query templates for different content categories
 */
export const SEARCH_QUERIES = {
  conversationalAI: [
    'conversational AI recruiting',
    'voice AI interviews',
    'AI phone screening tools',
    'automated phone interviews',
    'live AI interviewer',
    'real-time AI recruiting',
    'voice-first recruiting technology',
    'alternatives to HireVue',
    'alternatives to async video interviews',
    'LiveKit recruiting applications',
  ],
  candidateScreening: [
    'candidate screening automation',
    'AI-powered candidate assessment',
    'phone screen automation',
    'interview scheduling alternatives',
    'pre-screening candidates with AI',
    'technical recruiting tools 2024',
    'technical recruiting tools 2025',
  ],
  hrTech: [
    'ATS alternatives',
    'modern applicant tracking',
    'recruiting tech stack',
    'hiring automation tools',
    'best recruiting software for startups',
    'AI recruiting platforms comparison',
  ],
  remoteWork: [
    'remote hiring best practices',
    'async interview tools',
    'phone-first recruiting',
    'eliminating scheduling in hiring',
  ],
  emergingTech: [
    'Azure OpenAI applications in HR',
    'GPT-5 use cases recruiting',
    'GPT-4 recruiting',
    'AI voice agents for business',
    'WebRTC recruiting applications',
  ],
};

/**
 * Content sources to search
 */
export const SEARCH_SOURCES = {
  techBlogs: ['dev.to', 'medium.com', 'hashnode.dev', 'substack.com'],
  hrPublications: [
    'hrtechnologist.com',
    'recruitingdaily.com',
    'ere.net',
    'tlnt.com',
    'hrdive.com',
  ],
  vcStartup: ['techcrunch.com', 'a16z.com', 'firstround.com'],
  comparison: ['g2.com', 'capterra.com', 'softwareadvice.com'],
  communities: ['reddit.com', 'news.ycombinator.com', 'indiehackers.com'],
};

/**
 * Keywords for topic detection
 */
/**
 * Scoring configuration thresholds
 */
export const SCORING_CONFIG = {
  wordCountThresholds: [
    { min: 2500, points: 8 },
    { min: 1800, points: 7 },
    { min: 1500, points: 6 },
    { min: 1000, points: 5 },
    { min: 800, points: 4 },
    { min: 500, points: 3 },
    { min: 0, points: 2 },
  ],
  contentTypeScores: {
    guide: 7,
    comparison: 7,
    listicle: 6,
    'case-study': 5,
    tutorial: 5,
    news: 4,
    opinion: 3,
    default: 3,
  } as Record<string, number>,
};

/**
 * Publication authority tiers (configurable)
 */
export const PUBLICATION_TIERS = {
  major: [
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
  ],
  hrTech: [
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
  ],
  techBlogs: [
    'medium',
    'dev.to',
    'hackernoon',
    'towards data science',
    'better programming',
    'freecodecamp',
    'smashing magazine',
  ],
};

export const TOPIC_KEYWORDS = {
  'voice-ai': [
    'voice ai',
    'voice assistant',
    'speech recognition',
    'voice interview',
    'phone ai',
    'conversational ai',
    'livekit',
    'webrtc',
  ],
  'candidate-screening': [
    'candidate screening',
    'pre-screening',
    'phone screen',
    'video screen',
    'assessment',
    'evaluation',
  ],
  'hr-tech': [
    'hr tech',
    'recruiting tool',
    'ats',
    'applicant tracking',
    'talent acquisition',
    'hiring software',
  ],
  'interview-automation': [
    'automated interview',
    'interview automation',
    'ai interview',
    'interview scheduling',
    'interview platform',
  ],
  startup: ['startup', 'founder', 'funding', 'seed', 'series a', 'yc', 'y combinator'],
  'remote-work': ['remote hiring', 'remote work', 'distributed team', 'async work'],
};

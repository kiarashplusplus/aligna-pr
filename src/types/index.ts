/**
 * Core type definitions for Aligna PR Prospecting Tool
 */

// ============================================
// Article Types
// ============================================

export interface Article {
  // Core metadata
  title: string;
  url: string;
  publicationName: string;
  publishDate: Date | null;
  lastUpdated: Date | null;

  // Content
  fullText: string;
  excerpt: string;
  wordCount: number;

  // Classification
  detectedTopics: string[];
  contentType: ContentType;
  mentionsProducts: boolean;
  mentionsCompetitors: string[];

  // Technical metadata
  domain: string;
  domainAuthority?: number;
}

export type ContentType =
  | 'listicle'
  | 'guide'
  | 'comparison'
  | 'case-study'
  | 'news'
  | 'opinion'
  | 'tutorial';

// ============================================
// Author Types
// ============================================

export interface AuthorContact {
  // Identity
  name: string;
  bio?: string;
  title?: string;

  // Social & Web Presence
  authorWebsite?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  githubUsername?: string;

  // Contact Methods
  publicEmail?: string;
  contactFormUrl?: string;

  // Context
  isFreelance: boolean;
  isEditor: boolean;
  worksForPublication: string;

  // Inferred contact strategy
  bestContactMethod: ContactMethod;
  contactNotes: string;
}

export type ContactMethod =
  | 'email'
  | 'linkedin-dm'
  | 'twitter-dm'
  | 'contact-form'
  | 'unknown';

// ============================================
// Scoring Types
// ============================================

export interface ScoringFactors {
  topicalRelevance: number; // 0-30 points
  articleQuality: number; // 0-20 points
  updateability: number; // 0-20 points
  authorCredibility: number; // 0-15 points
  competitiveGap: number; // 0-10 points
  reachability: number; // 0-5 points
}

export type Priority = 'excellent' | 'strong' | 'moderate' | 'weak' | 'skip';

// ============================================
// Outreach Types
// ============================================

export interface OutreachRecommendation {
  score: number;
  priority: Priority;
  opportunityReason: string;
  angle: string;
  suggestedSubject: string;
  suggestedEmailDraft: string;
  contactMethod: ContactMethod;
  estimatedResponseRate: 'high' | 'medium' | 'low';
}

// ============================================
// Prospect Types (Combined Output)
// ============================================

export interface Prospect {
  id: string;
  article: Article;
  author: AuthorContact;
  score: number;
  scoreBreakdown: ScoringFactors;
  priority: Priority;
  outreach: OutreachRecommendation;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Result Types
// ============================================

export interface ProspectingResult {
  metadata: {
    searchDate: Date;
    queries: string[];
    totalArticlesFound: number;
    totalArticlesScored: number;
    averageScore: number;
    highPriorityCount: number;
    processingTimeMs: number;
  };
  prospects: Prospect[];
}

// ============================================
// Contact Tracking Types
// ============================================

export interface ContactHistory {
  prospectId: string;
  outreachDate: Date;
  followUpDate?: Date;
  response?: 'positive' | 'negative' | 'no-response';
  outcome?: 'backlink-added' | 'declined-politely' | 'no-response' | 'spam-report';
  notes: string;
}

// ============================================
// Search Types
// ============================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  dateRestrict?: string; // e.g., 'm6' for last 6 months
}

// ============================================
// CLI Types
// ============================================

export interface CLIOptions {
  query?: string;
  queries?: string;
  sources?: string;
  limit?: number;
  minScore?: number;
  output?: 'json' | 'csv' | 'both';
  outputPath?: string;
  update?: boolean;
  input?: string;
  verbose?: boolean;
}

// ============================================
// Configuration Types
// ============================================

export interface Config {
  // API Keys
  googleSearchApiKey?: string;
  googleSearchEngineId?: string;
  bingSearchApiKey?: string;
  openaiApiKey?: string;

  // Storage
  databasePath: string;

  // Scraping
  maxRequestsPerHour: number;
  minDelayBetweenRequests: number;
  userAgent: string;

  // Output
  outputFormat: 'json' | 'csv' | 'both';
  outputPath: string;

  // Application
  minScore: number;
  maxArticlesPerQuery: number;
  verbose: boolean;
}

// ============================================
// Competitor Analysis Types
// ============================================

export interface CompetitorAnalysis {
  mentionsCompetitors: string[];
  competitorPositioning: string;
  gapOpportunity: string;
}

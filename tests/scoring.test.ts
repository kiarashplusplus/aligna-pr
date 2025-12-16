/**
 * Tests for scoring module
 */

import { describe, it, expect } from 'vitest';
import { scoreTopicalRelevance } from '../src/scoring/relevance-scorer';
import { scoreArticleQuality } from '../src/scoring/quality-scorer';
import { scoreUpdateability } from '../src/scoring/updateability-scorer';
import {
  calculateScore,
  getPriority,
  scoreAuthorCredibility,
  scoreCompetitiveGap,
  scoreReachability,
} from '../src/scoring';
import { Article, AuthorContact } from '../src/types';

// Mock article data
const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  title: 'Top 10 AI Recruiting Tools for 2024',
  url: 'https://example.com/article',
  publicationName: 'TechCrunch',
  publishDate: new Date('2024-06-01'),
  lastUpdated: new Date('2024-11-01'),
  fullText: 'This guide covers the best AI recruiting tools including HireVue for video screening...',
  excerpt: 'This guide covers the best AI recruiting tools...',
  wordCount: 2000,
  detectedTopics: ['hr-tech', 'candidate-screening'],
  contentType: 'listicle',
  mentionsProducts: true,
  mentionsCompetitors: ['hirevue'],
  domain: 'techcrunch.com',
  ...overrides,
});

// Mock author data
const createMockAuthor = (overrides: Partial<AuthorContact> = {}): AuthorContact => ({
  name: 'Jane Doe',
  bio: 'Tech writer covering HR technology and recruiting automation.',
  title: 'Senior Editor',
  linkedInUrl: 'https://linkedin.com/in/janedoe',
  twitterHandle: 'janedoe',
  publicEmail: 'jane@example.com',
  isFreelance: false,
  isEditor: true,
  worksForPublication: 'TechCrunch',
  bestContactMethod: 'email',
  contactNotes: 'Email available',
  ...overrides,
});

describe('Topical Relevance Scoring', () => {
  it('should score perfect match keywords highest', () => {
    const article = createMockArticle({
      title: 'Conversational AI Interview Tools',
      fullText: 'Voice AI recruiting platforms are revolutionizing candidate screening...',
    });
    
    const score = scoreTopicalRelevance(article);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('should score strong match keywords', () => {
    const article = createMockArticle({
      title: 'HireVue Alternatives for 2024',
      fullText: 'Looking for async video interview alternatives...',
    });
    
    const score = scoreTopicalRelevance(article);
    expect(score).toBeGreaterThanOrEqual(18);
    expect(score).toBeLessThanOrEqual(24);
  });

  it('should score moderate match topics', () => {
    const article = createMockArticle({
      title: 'HR Tech Trends 2024',
      fullText: 'Talent acquisition software continues to evolve...',
      detectedTopics: ['hr-tech'],
    });
    
    const score = scoreTopicalRelevance(article);
    expect(score).toBeGreaterThanOrEqual(8);
    expect(score).toBeLessThanOrEqual(17);
  });

  it('should score weak match lowest', () => {
    const article = createMockArticle({
      title: 'General Business Software',
      fullText: 'Business productivity tools for 2024...',
      detectedTopics: [],
    });
    
    const score = scoreTopicalRelevance(article);
    expect(score).toBeLessThan(8);
  });
});

describe('Article Quality Scoring', () => {
  it('should score high word count articles higher', () => {
    const longArticle = createMockArticle({ wordCount: 3000 });
    const shortArticle = createMockArticle({ wordCount: 500 });
    
    const longScore = scoreArticleQuality(longArticle);
    const shortScore = scoreArticleQuality(shortArticle);
    
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it('should score guides and comparisons highest', () => {
    const guide = createMockArticle({ contentType: 'guide' });
    const comparison = createMockArticle({ contentType: 'comparison' });
    const opinion = createMockArticle({ contentType: 'opinion' });
    
    const guideScore = scoreArticleQuality(guide);
    const comparisonScore = scoreArticleQuality(comparison);
    const opinionScore = scoreArticleQuality(opinion);
    
    expect(guideScore).toBeGreaterThan(opinionScore);
    expect(comparisonScore).toBeGreaterThan(opinionScore);
  });

  it('should add points for product mentions', () => {
    const withProducts = createMockArticle({ mentionsProducts: true });
    const withoutProducts = createMockArticle({ mentionsProducts: false });
    
    const withScore = scoreArticleQuality(withProducts);
    const withoutScore = scoreArticleQuality(withoutProducts);
    
    expect(withScore).toBeGreaterThan(withoutScore);
  });
});

describe('Updateability Scoring', () => {
  it('should score recently updated articles higher', () => {
    const recent = createMockArticle({
      lastUpdated: new Date(),
    });
    const old = createMockArticle({
      publishDate: new Date('2020-01-01'),
      lastUpdated: null,
    });
    
    const recentScore = scoreUpdateability(recent);
    const oldScore = scoreUpdateability(old);
    
    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it('should score listicles higher for update potential', () => {
    const listicle = createMockArticle({ contentType: 'listicle' });
    const news = createMockArticle({ contentType: 'news' });
    
    const listicleScore = scoreUpdateability(listicle);
    const newsScore = scoreUpdateability(news);
    
    expect(listicleScore).toBeGreaterThan(newsScore);
  });
});

describe('Author Credibility Scoring', () => {
  it('should score freelancers higher', () => {
    const freelancer = createMockAuthor({ isFreelance: true, isEditor: false });
    const editor = createMockAuthor({ isFreelance: false, isEditor: true });
    const article = createMockArticle();
    
    const freelancerScore = scoreAuthorCredibility(freelancer, article);
    const editorScore = scoreAuthorCredibility(editor, article);
    
    expect(freelancerScore).toBeGreaterThan(editorScore);
  });

  it('should score HR/tech expertise higher', () => {
    const expert = createMockAuthor({ bio: 'HR tech specialist and recruiting expert' });
    const general = createMockAuthor({ bio: 'General news writer' });
    const article = createMockArticle();
    
    const expertScore = scoreAuthorCredibility(expert, article);
    const generalScore = scoreAuthorCredibility(general, article);
    
    expect(expertScore).toBeGreaterThan(generalScore);
  });
});

describe('Competitive Gap Scoring', () => {
  it('should score high when competitors mentioned but not Aligna', () => {
    const article = createMockArticle({
      fullText: 'HireVue and Modern Hire are popular video interview tools...',
      mentionsCompetitors: ['hirevue', 'modern hire'],
    });
    
    const score = scoreCompetitiveGap(article);
    expect(score).toBe(10);
  });

  it('should score zero if Aligna is already mentioned', () => {
    const article = createMockArticle({
      fullText: 'Tools like Aligna and HireVue offer different approaches...',
    });
    
    const score = scoreCompetitiveGap(article);
    expect(score).toBe(0);
  });
});

describe('Reachability Scoring', () => {
  it('should score email highest', () => {
    const withEmail = createMockAuthor({ publicEmail: 'test@example.com' });
    const score = scoreReachability(withEmail);
    expect(score).toBe(5);
  });

  it('should score contact form next', () => {
    const withForm = createMockAuthor({
      publicEmail: undefined,
      contactFormUrl: 'https://example.com/contact',
    });
    const score = scoreReachability(withForm);
    expect(score).toBe(4);
  });

  it('should score zero with no contact info', () => {
    const noContact = createMockAuthor({
      publicEmail: undefined,
      contactFormUrl: undefined,
      linkedInUrl: undefined,
      twitterHandle: undefined,
    });
    const score = scoreReachability(noContact);
    expect(score).toBe(0);
  });
});

describe('Priority Determination', () => {
  it('should return excellent for scores 80+', () => {
    expect(getPriority(85)).toBe('excellent');
    expect(getPriority(100)).toBe('excellent');
  });

  it('should return strong for scores 60-79', () => {
    expect(getPriority(60)).toBe('strong');
    expect(getPriority(79)).toBe('strong');
  });

  it('should return moderate for scores 40-59', () => {
    expect(getPriority(40)).toBe('moderate');
    expect(getPriority(59)).toBe('moderate');
  });

  it('should return weak for scores 20-39', () => {
    expect(getPriority(20)).toBe('weak');
    expect(getPriority(39)).toBe('weak');
  });

  it('should return skip for scores below 20', () => {
    expect(getPriority(10)).toBe('skip');
    expect(getPriority(0)).toBe('skip');
  });
});

describe('Complete Score Calculation', () => {
  it('should calculate total score from all factors', () => {
    const article = createMockArticle();
    const author = createMockAuthor();
    
    const { score, breakdown } = calculateScore(article, author);
    
    // Score should be sum of all factors
    const expectedTotal = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    expect(score).toBe(expectedTotal);
    
    // Score should be within valid range
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should include all scoring factors in breakdown', () => {
    const article = createMockArticle();
    const author = createMockAuthor();
    
    const { breakdown } = calculateScore(article, author);
    
    expect(breakdown).toHaveProperty('topicalRelevance');
    expect(breakdown).toHaveProperty('articleQuality');
    expect(breakdown).toHaveProperty('updateability');
    expect(breakdown).toHaveProperty('authorCredibility');
    expect(breakdown).toHaveProperty('competitiveGap');
    expect(breakdown).toHaveProperty('reachability');
  });
});

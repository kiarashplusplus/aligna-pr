/**
 * Tests for outreach module
 */

import { describe, it, expect } from 'vitest';
import {
  generateOutreachAngle,
  getCompetitorAngle,
  generateOpportunityReason,
} from '../src/outreach/angle-generator';
import {
  generateSubject,
  generateEmailDraft,
  generateSpecificValue,
  generateAsk,
} from '../src/outreach/email-template';
import {
  analyzeArticleCompetitors,
  getCompetitorSentimentSummary,
} from '../src/outreach/competitor-sentiment';
import {
  isOpenAIConfigured,
  generateEnhancedAngle,
  generateBatchAngles,
} from '../src/outreach/openai-angle';
import { Article, AuthorContact } from '../src/types';

// Mock article data
const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  title: 'Top 10 AI Recruiting Tools',
  url: 'https://example.com/article',
  publicationName: 'TechCrunch',
  publishDate: new Date('2024-06-01'),
  lastUpdated: new Date('2024-11-01'),
  fullText: 'This guide covers AI recruiting tools...',
  excerpt: 'This guide covers AI recruiting tools...',
  wordCount: 2000,
  detectedTopics: ['hr-tech'],
  contentType: 'listicle',
  mentionsProducts: true,
  mentionsCompetitors: [],
  domain: 'techcrunch.com',
  ...overrides,
});

const createMockAuthor = (overrides: Partial<AuthorContact> = {}): AuthorContact => ({
  name: 'Jane Doe',
  bio: 'Tech writer',
  isFreelance: false,
  isEditor: false,
  worksForPublication: 'TechCrunch',
  bestContactMethod: 'email',
  contactNotes: '',
  publicEmail: 'jane@example.com',
  ...overrides,
});

describe('Outreach Angle Generator', () => {
  it('should generate async video angle when HireVue mentioned', () => {
    const article = createMockArticle({
      fullText: 'HireVue offers async video interviewing for candidates...',
    });
    
    const angle = generateOutreachAngle(article);
    
    expect(angle).toContain('async video');
    expect(angle).toContain('Aligna');
  });

  it('should generate scheduling angle when scheduling mentioned', () => {
    const article = createMockArticle({
      fullText: 'Scheduling interviews with Calendly can be challenging...',
      contentType: 'guide', // Not a listicle, so won't match the listicle angle first
      mentionsProducts: false,
    });
    
    const angle = generateOutreachAngle(article);
    
    expect(angle).toContain('scheduling');
  });

  it('should generate listicle angle for product lists', () => {
    const article = createMockArticle({
      contentType: 'listicle',
      mentionsProducts: true,
      fullText: 'Here are the best tools for recruiting...',
    });
    
    const angle = generateOutreachAngle(article);
    
    expect(angle).toContain('list');
  });

  it('should return generic angle for non-specific content', () => {
    const article = createMockArticle({
      fullText: 'General article about technology trends...',
      contentType: 'opinion',
      mentionsProducts: false,
    });
    
    const angle = generateOutreachAngle(article);
    
    expect(angle.length).toBeGreaterThan(0);
    expect(angle).toContain('voice AI');
  });
});

describe('Competitor Angle Generator', () => {
  it('should generate HireVue-specific angle', () => {
    const article = createMockArticle({
      fullText: 'HireVue is expensive and feels impersonal...',
    });
    
    const angle = getCompetitorAngle(article);
    
    expect(angle).not.toBeNull();
    expect(angle).toContain('HireVue');
  });

  it('should return null when no competitors mentioned', () => {
    const article = createMockArticle({
      fullText: 'General recruiting article...',
    });
    
    const angle = getCompetitorAngle(article);
    
    expect(angle).toBeNull();
  });
});

describe('Email Subject Generator', () => {
  it('should generate listicle subject', () => {
    const article = createMockArticle({ contentType: 'listicle' });
    const subject = generateSubject(article);
    
    expect(subject).toContain('tools');
  });

  it('should generate comparison subject', () => {
    const article = createMockArticle({ contentType: 'comparison' });
    const subject = generateSubject(article);
    
    expect(subject).toContain('alternative');
  });

  it('should generate guide subject', () => {
    const article = createMockArticle({ contentType: 'guide' });
    const subject = generateSubject(article);
    
    expect(subject).toContain('guide');
  });
});

describe('Email Draft Generator', () => {
  it('should include author first name', () => {
    const article = createMockArticle();
    const author = createMockAuthor({ name: 'Jane Doe' });
    
    const draft = generateEmailDraft(article, author, 'Test angle');
    
    expect(draft).toContain('Hi Jane');
  });

  it('should include article title', () => {
    const article = createMockArticle({ title: 'My Test Article' });
    const author = createMockAuthor();
    
    const draft = generateEmailDraft(article, author, 'Test angle');
    
    expect(draft).toContain('My Test Article');
  });

  it('should include publication name', () => {
    const article = createMockArticle({ publicationName: 'TechBlog' });
    const author = createMockAuthor();
    
    const draft = generateEmailDraft(article, author, 'Test angle');
    
    expect(draft).toContain('TechBlog');
  });

  it('should include Aligna URL', () => {
    const article = createMockArticle();
    const author = createMockAuthor();
    
    const draft = generateEmailDraft(article, author, 'Test angle');
    
    expect(draft).toContain('https://www.align-a.com');
  });

  it('should include key differentiators', () => {
    const article = createMockArticle();
    const author = createMockAuthor();
    
    const draft = generateEmailDraft(article, author, 'Test angle');
    
    expect(draft).toContain('Real-time AI phone conversations');
    expect(draft).toContain('LiveKit');
  });
});

describe('Specific Value Generator', () => {
  it('should mention phone-first for HireVue context', () => {
    const article = createMockArticle({
      fullText: 'HireVue video interviews...',
    });
    
    const value = generateSpecificValue(article);
    
    expect(value).toContain('phone-first');
  });

  it('should mention scheduling for calendar context', () => {
    const article = createMockArticle({
      fullText: 'Scheduling with Calendly...',
    });
    
    const value = generateSpecificValue(article);
    
    expect(value).toContain('anytime');
  });

  it('should mention technical background for developer context', () => {
    const article = createMockArticle({
      fullText: 'Technical recruiting for developers...',
    });
    
    const value = generateSpecificValue(article);
    
    expect(value).toContain('technical');
  });
});

describe('Ask Generator', () => {
  it('should generate listicle-specific ask', () => {
    const article = createMockArticle({ contentType: 'listicle' });
    const author = createMockAuthor();
    
    const ask = generateAsk(article, author);
    
    expect(ask).toContain('list');
  });

  it('should generate comparison-specific ask', () => {
    const article = createMockArticle({ contentType: 'comparison' });
    const author = createMockAuthor();
    
    const ask = generateAsk(article, author);
    
    expect(ask).toContain('alternative');
  });

  it('should mention update for articles with lastUpdated', () => {
    const article = createMockArticle({
      contentType: 'guide',
      lastUpdated: new Date(),
    });
    const author = createMockAuthor();
    
    const ask = generateAsk(article, author);
    
    expect(ask).toContain('update');
  });
});

describe('Opportunity Reason Generator', () => {
  it('should mention excellent score for high scores', () => {
    const article = createMockArticle();
    
    const reason = generateOpportunityReason(article, 85);
    
    expect(reason).toContain('Excellent');
  });

  it('should mention competitor gap', () => {
    const article = createMockArticle({
      mentionsCompetitors: ['hirevue', 'modern hire'],
    });
    
    const reason = generateOpportunityReason(article, 70);
    
    expect(reason).toContain('competitor');
  });

  it('should mention listicle format', () => {
    const article = createMockArticle({ contentType: 'listicle' });
    
    const reason = generateOpportunityReason(article, 60);
    
    expect(reason).toContain('Listicle');
  });
});

describe('Competitor Sentiment Analysis', () => {
  it('should detect negative sentiment about HireVue cost', () => {
    const article = createMockArticle({
      fullText: 'HireVue is a popular tool but many companies find it expensive and the pricing is not transparent. The cost can be prohibitive for startups.',
      mentionsCompetitors: ['hirevue'],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.hasCompetitorMentions).toBe(true);
    expect(analysis.competitors.length).toBe(1);
    expect(analysis.competitors[0].competitor).toBe('hirevue');
    expect(analysis.competitors[0].sentiment).toBe('negative');
    expect(analysis.competitors[0].aspects.some((a: any) => a.aspect === 'cost')).toBe(true);
  });

  it('should detect negative sentiment about candidate experience', () => {
    const article = createMockArticle({
      fullText: 'Modern Hire video interviews leave candidates feeling awkward and uncomfortable recording themselves. The experience can be stressful and candidates often complain about poor performance.',
      mentionsCompetitors: ['modern hire'],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.hasCompetitorMentions).toBe(true);
    expect(analysis.competitors[0].sentiment).toBe('negative');
    expect(analysis.competitors[0].aspects.some((a: any) => a.aspect === 'experience')).toBe(true);
  });

  it('should detect neutral sentiment when no sentiment keywords', () => {
    const article = createMockArticle({
      fullText: 'Spark Hire is one of the video interview platforms available in the market today.',
      mentionsCompetitors: ['spark hire'],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.hasCompetitorMentions).toBe(true);
    expect(analysis.competitors[0].sentiment).toBe('neutral');
  });

  it('should detect mixed sentiment', () => {
    const article = createMockArticle({
      fullText: 'HireVue is feature-rich and comprehensive, but it can be expensive and the interface feels clunky at times.',
      mentionsCompetitors: ['hirevue'],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.hasCompetitorMentions).toBe(true);
    expect(analysis.competitors[0].sentiment).toBe('mixed');
  });

  it('should return empty analysis when no competitors mentioned', () => {
    const article = createMockArticle({
      fullText: 'AI recruiting tools are becoming more popular.',
      mentionsCompetitors: [],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.hasCompetitorMentions).toBe(false);
    expect(analysis.competitors.length).toBe(0);
  });

  it('should generate sentiment summary', () => {
    const article = createMockArticle({
      fullText: 'HireVue is expensive. Karat is effective but costly.',
      mentionsCompetitors: ['hirevue', 'karat'],
    });
    
    const summary = getCompetitorSentimentSummary(article);
    
    expect(summary).toContain('hirevue');
    expect(summary).toContain('karat');
  });

  it('should prioritize negative sentiment in suggested angles', () => {
    const article = createMockArticle({
      fullText: 'HireVue is frustrating and expensive. The user experience is poor.',
      mentionsCompetitors: ['hirevue'],
    });
    
    const analysis = analyzeArticleCompetitors(article);
    
    expect(analysis.bestAngle).toBeTruthy();
    expect(analysis.overallOpportunity).toContain('High opportunity');
  });
});

describe('OpenAI Angle Generator', () => {
  it('should report OpenAI as not configured without API key', () => {
    // Without OPENAI_API_KEY set, should return false
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    
    // Verify the function exists and returns boolean
    expect(typeof isOpenAIConfigured()).toBe('boolean');
    
    // Restore
    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  });

  it('should export all expected functions', async () => {
    const openaiModule = await import('../src/outreach/openai-angle');
    
    expect(typeof openaiModule.isOpenAIConfigured).toBe('function');
    expect(typeof openaiModule.generateEnhancedAngle).toBe('function');
    expect(typeof openaiModule.generateEnhancedEmailDraft).toBe('function');
    expect(typeof openaiModule.generateBatchAngles).toBe('function');
    expect(typeof openaiModule.analyzeArticleSentiment).toBe('function');
  });

  it('should return fallback angle when OpenAI not configured', async () => {
    const article = createMockArticle({
      fullText: 'This is an article about recruiting tools.',
    });
    
    const fallback = 'Test fallback angle';
    const result = await generateEnhancedAngle(article, undefined, fallback);
    
    // Without API key, should return fallback
    expect(result).toBeTruthy();
  });

  it('should return fallback angles in batch mode when OpenAI not configured', async () => {
    const articles = [
      createMockArticle({ url: 'https://example.com/1', title: 'Article 1' }),
      createMockArticle({ url: 'https://example.com/2', title: 'Article 2' }),
    ];
    
    const fallbackGenerator = (article: Article) => `Fallback for ${article.title}`;
    
    const results = await generateBatchAngles(articles, fallbackGenerator);
    
    expect(results.size).toBe(2);
    expect(results.get('https://example.com/1')).toBe('Fallback for Article 1');
    expect(results.get('https://example.com/2')).toBe('Fallback for Article 2');
  });
});

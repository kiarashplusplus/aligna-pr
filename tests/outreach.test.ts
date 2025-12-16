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

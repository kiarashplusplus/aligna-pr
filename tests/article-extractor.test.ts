/**
 * Tests for article extractor
 */

import { describe, it, expect } from 'vitest';
import { parseArticleHtml, mentionsAligna, hasUpdateSignals } from '../src/search/parsers/article-extractor';

describe('Article HTML Parser', () => {
  it('should extract title from meta tags', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Test Article Title" />
        </head>
        <body>
          <article><p>Article content here.</p></article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article).not.toBeNull();
    expect(article?.title).toBe('Test Article Title');
  });

  it('should extract content and calculate word count', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <article>
            <p>This is a test article with some content.</p>
            <p>Here is more content for testing purposes.</p>
          </article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article).not.toBeNull();
    expect(article?.wordCount).toBeGreaterThan(0);
    expect(article?.fullText.length).toBeGreaterThan(0);
  });

  it('should detect listicle content type', () => {
    const html = `
      <html>
        <head><title>Top 10 Best Tools for 2024</title></head>
        <body>
          <article>
            <h1>Top 10 Best Tools for 2024</h1>
            <p>Content about tools.</p>
          </article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article?.contentType).toBe('listicle');
  });

  it('should detect comparison content type', () => {
    const html = `
      <html>
        <head><title>HireVue vs Spark Hire Comparison</title></head>
        <body>
          <article>
            <h1>HireVue vs Spark Hire Comparison</h1>
            <p>Comparing video interview platforms.</p>
          </article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article?.contentType).toBe('comparison');
  });

  it('should detect guide content type', () => {
    const html = `
      <html>
        <head><title>Complete Guide to AI Recruiting</title></head>
        <body>
          <article>
            <h1>Complete Guide to AI Recruiting</h1>
            <p>Everything you need to know.</p>
          </article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article?.contentType).toBe('guide');
  });

  it('should detect competitor mentions', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <article>
            <p>HireVue and Modern Hire are popular platforms.</p>
          </article>
        </body>
      </html>
    `;
    
    const article = parseArticleHtml('https://example.com/test', html);
    
    expect(article?.mentionsCompetitors).toContain('hirevue');
    expect(article?.mentionsCompetitors).toContain('modern hire');
  });

  it('should extract domain correctly', () => {
    const html = `
      <html><head><title>Test</title></head>
      <body><article><p>Content</p></article></body></html>
    `;
    
    const article = parseArticleHtml('https://www.techcrunch.com/article', html);
    
    expect(article?.domain).toBe('www.techcrunch.com');
  });
});

describe('Aligna Mention Detection', () => {
  it('should detect "aligna" mention', () => {
    expect(mentionsAligna('Check out Aligna for recruiting.')).toBe(true);
  });

  it('should detect "align-a" mention', () => {
    expect(mentionsAligna('Align-a offers voice AI interviews.')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(mentionsAligna('ALIGNA is great.')).toBe(true);
  });

  it('should return false when not mentioned', () => {
    expect(mentionsAligna('HireVue is a video interview tool.')).toBe(false);
  });
});

describe('Update Signals Detection', () => {
  it('should detect "last updated" text', () => {
    expect(hasUpdateSignals('Last updated: November 2024')).toBe(true);
  });

  it('should detect "updated:" prefix', () => {
    expect(hasUpdateSignals('Updated: 2024-11-01')).toBe(true);
  });

  it('should detect update invitation', () => {
    expect(hasUpdateSignals("We'll update this list periodically.")).toBe(true);
  });

  it('should detect feedback invitation', () => {
    expect(hasUpdateSignals('Let us know if we missed anything!')).toBe(true);
  });

  it('should return false for static content', () => {
    expect(hasUpdateSignals('This is a static article about tools.')).toBe(false);
  });
});

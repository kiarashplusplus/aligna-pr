/**
 * Author contact information extractor
 */

import { load, CheerioAPI } from 'cheerio';
import { scraper } from '../scraper';
import { AuthorContact, ContactMethod } from '../../types';
import { logger } from '../../utils';

/**
 * Extract author information from article HTML
 */
export function extractAuthorFromHtml(html: string, url: string): AuthorContact {
  const $ = load(html);
  const domain = new URL(url).hostname;

  // Initialize with defaults
  const author: AuthorContact = {
    name: 'Unknown Author',
    isFreelance: false,
    isEditor: false,
    worksForPublication: domain,
    bestContactMethod: 'unknown',
    contactNotes: '',
  };

  // Extract author name
  author.name = extractAuthorName($);

  // Extract author bio
  author.bio = extractAuthorBio($);

  // Extract author title/role
  author.title = extractAuthorTitle($);

  // Check if freelance or editor
  const bioLower = (author.bio || '').toLowerCase();
  const titleLower = (author.title || '').toLowerCase();

  author.isFreelance =
    bioLower.includes('freelance') ||
    bioLower.includes('independent') ||
    bioLower.includes('contributor') ||
    titleLower.includes('freelance');

  author.isEditor =
    titleLower.includes('editor') ||
    bioLower.includes('editor') ||
    titleLower.includes('managing');

  // Extract social links
  author.linkedInUrl = extractLinkedIn($);
  author.twitterHandle = extractTwitter($);
  author.githubUsername = extractGithub($);
  author.authorWebsite = extractAuthorWebsite($, domain);

  // Extract public email (only if explicitly published)
  author.publicEmail = extractPublicEmail($);

  // Look for contact form
  author.contactFormUrl = extractContactForm($, url);

  // Determine best contact method
  author.bestContactMethod = determineContactMethod(author);

  // Generate contact notes
  author.contactNotes = generateContactNotes(author);

  return author;
}

/**
 * Extract author name from various sources
 */
function extractAuthorName($: CheerioAPI): string {
  const nameSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author-name',
    '.post-author',
    '.byline',
    '.author a',
    '.entry-author',
    '[itemprop="author"]',
    '.vcard .fn',
  ];

  for (const selector of nameSelectors) {
    const element = $(selector).first();
    const name = element.attr('content') || element.text();
    const cleaned = name?.trim().replace(/^by\s+/i, '');

    if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
      return cleaned;
    }
  }

  return 'Unknown Author';
}

/**
 * Extract author bio
 */
function extractAuthorBio($: CheerioAPI): string | undefined {
  const bioSelectors = [
    '.author-bio',
    '.author-description',
    '.post-author-bio',
    '[itemprop="description"]',
    '.author-info p',
  ];

  for (const selector of bioSelectors) {
    const bio = $(selector).first().text().trim();
    if (bio && bio.length > 20) {
      return bio.slice(0, 500);
    }
  }

  return undefined;
}

/**
 * Extract author title/role
 */
function extractAuthorTitle($: CheerioAPI): string | undefined {
  const titleSelectors = [
    '.author-title',
    '.author-role',
    '[itemprop="jobTitle"]',
    '.author-info .title',
  ];

  for (const selector of titleSelectors) {
    const title = $(selector).first().text().trim();
    if (title && title.length > 0) {
      return title;
    }
  }

  return undefined;
}

/**
 * Extract LinkedIn URL
 */
function extractLinkedIn($: CheerioAPI): string | undefined {
  // Look for LinkedIn links
  const linkedInLink = $('a[href*="linkedin.com"]').first();
  const href = linkedInLink.attr('href');

  if (href && href.includes('linkedin.com/in/')) {
    return href;
  }

  // Look in text content for LinkedIn mentions
  const bodyText = $('body').text();
  const linkedInMatch = bodyText.match(
    /(?:linkedin\.com\/in\/)([\w-]+)/i
  );
  if (linkedInMatch) {
    return `https://www.linkedin.com/in/${linkedInMatch[1]}`;
  }

  return undefined;
}

/**
 * Extract Twitter handle
 */
function extractTwitter($: CheerioAPI): string | undefined {
  // Look for Twitter/X links
  const twitterLink = $('a[href*="twitter.com"], a[href*="x.com"]').first();
  const href = twitterLink.attr('href');

  if (href) {
    const match = href.match(/(?:twitter\.com|x\.com)\/(\w+)/);
    if (match && !['intent', 'share', 'search'].includes(match[1])) {
      return match[1];
    }
  }

  // Look for @handle patterns in author area
  const authorArea = $('.author, .author-bio, .byline').text();
  const handleMatch = authorArea.match(/@(\w{2,15})/);
  if (handleMatch) {
    return handleMatch[1];
  }

  return undefined;
}

/**
 * Extract GitHub username
 */
function extractGithub($: CheerioAPI): string | undefined {
  const githubLink = $('a[href*="github.com"]').first();
  const href = githubLink.attr('href');

  if (href) {
    const match = href.match(/github\.com\/(\w+)/);
    if (match && !['topics', 'search', 'explore', 'marketplace'].includes(match[1])) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract author's personal website
 */
function extractAuthorWebsite($: CheerioAPI, articleDomain: string): string | undefined {
  // Look for personal website links in author section
  const authorLinks = $('.author a, .author-bio a, .byline a');

  for (let i = 0; i < authorLinks.length; i++) {
    const href = $(authorLinks[i]).attr('href');
    if (href) {
      try {
        const linkDomain = new URL(href, `https://${articleDomain}`).hostname;
        
        // Skip social media and the article's own domain
        const skipDomains = [
          'twitter.com',
          'x.com',
          'linkedin.com',
          'facebook.com',
          'github.com',
          'medium.com',
          articleDomain,
        ];

        if (!skipDomains.some((d) => linkDomain.includes(d))) {
          return href;
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return undefined;
}

/**
 * Extract publicly listed email (ONLY from explicit publication)
 */
function extractPublicEmail($: CheerioAPI): string | undefined {
  // IMPORTANT: Only extract emails that are explicitly published

  // Look for mailto: links in author section
  const mailtoLinks = $('.author a[href^="mailto:"], .author-bio a[href^="mailto:"]');
  for (let i = 0; i < mailtoLinks.length; i++) {
    const href = $(mailtoLinks[i]).attr('href');
    if (href) {
      const email = href.replace('mailto:', '').split('?')[0];
      if (isValidEmail(email)) {
        return email;
      }
    }
  }

  // Look for email pattern in author bio (only if clearly personal contact)
  const authorBio = $('.author-bio, .author-info').text();
  const emailMatch = authorBio.match(
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/
  );
  if (emailMatch && isValidEmail(emailMatch[1])) {
    // Don't return generic emails
    const email = emailMatch[1].toLowerCase();
    if (
      !email.includes('noreply') &&
      !email.includes('info@') &&
      !email.includes('contact@') &&
      !email.includes('support@') &&
      !email.includes('hello@')
    ) {
      return emailMatch[1];
    }
  }

  return undefined;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length < 100;
}

/**
 * Look for contact form URL
 */
function extractContactForm($: CheerioAPI, articleUrl: string): string | undefined {
  // Common contact page patterns
  const contactPatterns = ['/contact', '/about', '/get-in-touch', '/reach-out'];

  // Check for links to contact pages
  const contactLinks = $('a[href*="contact"], a[href*="about"]');
  for (let i = 0; i < contactLinks.length; i++) {
    const href = $(contactLinks[i]).attr('href');
    if (href) {
      try {
        const fullUrl = new URL(href, articleUrl).href;
        if (contactPatterns.some((p) => fullUrl.includes(p))) {
          return fullUrl;
        }
      } catch {
        // Invalid URL
      }
    }
  }

  return undefined;
}

/**
 * Determine best contact method
 */
export function determineContactMethod(author: AuthorContact): ContactMethod {
  if (author.publicEmail) return 'email';
  if (author.contactFormUrl) return 'contact-form';
  if (author.linkedInUrl && author.isFreelance) return 'linkedin-dm';
  if (author.twitterHandle) return 'twitter-dm';
  return 'unknown';
}

/**
 * Generate human-readable contact notes
 */
function generateContactNotes(author: AuthorContact): string {
  const notes: string[] = [];

  if (author.publicEmail) {
    notes.push(`Email available: ${author.publicEmail}`);
  }

  if (author.linkedInUrl) {
    notes.push('LinkedIn profile found');
  }

  if (author.twitterHandle) {
    notes.push(`Twitter: @${author.twitterHandle}`);
  }

  if (author.authorWebsite) {
    notes.push('Personal website available');
  }

  if (author.contactFormUrl) {
    notes.push('Contact form available');
  }

  if (author.isFreelance) {
    notes.push('Freelance writer - likely more receptive');
  }

  if (author.isEditor) {
    notes.push('Editor role - may need editorial approval');
  }

  return notes.length > 0 ? notes.join('. ') : 'Limited contact info available';
}

/**
 * Fetch author page and enrich contact information
 */
export async function enrichAuthorFromProfile(
  author: AuthorContact,
  authorPageUrl: string
): Promise<AuthorContact> {
  try {
    const html = await scraper.fetch(authorPageUrl);
    const $ = load(html);

    // Look for additional information on author page
    if (!author.publicEmail) {
      author.publicEmail = extractPublicEmail($);
    }

    if (!author.linkedInUrl) {
      author.linkedInUrl = extractLinkedIn($);
    }

    if (!author.twitterHandle) {
      author.twitterHandle = extractTwitter($);
    }

    if (!author.githubUsername) {
      author.githubUsername = extractGithub($);
    }

    if (!author.bio) {
      author.bio = extractAuthorBio($);
    }

    // Re-determine contact method with new info
    author.bestContactMethod = determineContactMethod(author);
    author.contactNotes = generateContactNotes(author);

    return author;
  } catch (error) {
    logger.error(`Failed to enrich author from ${authorPageUrl}:`, error);
    return author;
  }
}

export { extractAuthorFromHtml as default };

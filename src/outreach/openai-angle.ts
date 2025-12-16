/**
 * OpenAI-powered angle generation for enhanced personalization
 * Uses GPT to generate more contextual, personalized outreach angles
 */

import OpenAI from 'openai';
import { Article, AuthorContact } from '../types';
import { config, ALIGNA } from '../config';
import { logger } from '../utils/logger';

/** Cached OpenAI client */
let openaiClient: OpenAI | null = null;

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!config.openaiApiKey;
}

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  if (!config.openaiApiKey) {
    return null;
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }
  
  return openaiClient;
}

/**
 * System prompt for angle generation
 */
const ANGLE_SYSTEM_PROMPT = `You are an expert PR outreach strategist for Aligna, a voice AI recruiting platform. Your job is to generate personalized, compelling outreach angles for articles.

About Aligna:
- Aligna is a conversational AI recruiter that conducts live phone interviews (not pre-recorded video)
- Built on LiveKit + Azure OpenAI for real-time voice-first candidate experience
- Eliminates scheduling - candidates just call a number anytime
- Founded by MIT alum Kiarash Adl
- Key differentiator: Live voice AI conversations vs. async video (HireVue, Spark Hire, etc.)

Your goal: Generate a brief, compelling angle (2-3 sentences) explaining why adding Aligna to this article would benefit readers. Be specific to the article content.

Rules:
1. Be genuine and specific - reference actual article content
2. Focus on the GAP the article is missing (voice AI category)
3. Don't be salesy - position as helpful addition
4. If competitors are mentioned negatively, leverage that positioning
5. Keep it concise - max 3 sentences
6. Never use generic marketing language`;

/**
 * Generate enhanced outreach angle using OpenAI
 */
export async function generateEnhancedAngle(
  article: Article,
  author?: AuthorContact,
  fallbackAngle?: string
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    logger.debug('OpenAI not configured, using fallback angle');
    return fallbackAngle || 'This article could benefit from mentioning voice AI alternatives like Aligna.';
  }

  try {
    const articleSummary = summarizeArticle(article);
    const competitorContext = getCompetitorContext(article);
    const authorContext = author ? getAuthorContext(author) : '';

    const userPrompt = `Generate a personalized outreach angle for this article:

**Article Title:** ${article.title}
**Publication:** ${article.publicationName}
**Content Type:** ${article.contentType}
**Topics:** ${article.detectedTopics.join(', ')}

**Article Summary:**
${articleSummary}

${competitorContext}
${authorContext}

Generate a 2-3 sentence angle explaining why adding Aligna would benefit this article's readers.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective for this use case
      messages: [
        { role: 'system', content: ANGLE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const generatedAngle = response.choices[0]?.message?.content?.trim();

    if (!generatedAngle) {
      logger.warn('OpenAI returned empty response, using fallback');
      return fallbackAngle || 'This article could benefit from mentioning voice AI alternatives like Aligna.';
    }

    logger.debug(`Generated angle with OpenAI: ${generatedAngle.substring(0, 50)}...`);
    return generatedAngle;

  } catch (error) {
    logger.error('OpenAI angle generation failed:', error);
    return fallbackAngle || 'This article could benefit from mentioning voice AI alternatives like Aligna.';
  }
}

/**
 * Generate enhanced email draft using OpenAI
 */
export async function generateEnhancedEmailDraft(
  article: Article,
  author: AuthorContact,
  angle: string
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    logger.debug('OpenAI not configured, cannot generate enhanced email');
    return '';
  }

  try {
    const firstName = author.name.split(' ')[0];
    
    const systemPrompt = `You are writing a personalized outreach email on behalf of Aligna, a voice AI recruiting startup. Write genuine, non-salesy emails that feel like one professional reaching out to another.

Key rules:
1. Be specific to the article - reference actual content
2. Keep it brief (under 200 words)
3. Sound human, not corporate
4. Include a specific compliment about their work
5. Make the ask clear but low-pressure
6. Sign off with "Best, Kiarash" (the founder)`;

    const userPrompt = `Write a personalized outreach email for:

**Recipient:** ${author.name} (${author.isFreelance ? 'freelance writer' : `writer at ${author.worksForPublication || 'publication'}`})
**Article:** "${article.title}" on ${article.publicationName}
**Content Type:** ${article.contentType}

**Angle to use:**
${angle}

**Aligna Quick Facts:**
- Live AI phone interviews (not pre-recorded video)
- Built on LiveKit + Azure OpenAI
- Founded by MIT alum
- URL: https://www.align-a.com

Generate a complete email with subject line.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedEmail = response.choices[0]?.message?.content?.trim();

    if (!generatedEmail) {
      logger.warn('OpenAI returned empty email response');
      return '';
    }

    logger.debug('Generated enhanced email with OpenAI');
    return generatedEmail;

  } catch (error) {
    logger.error('OpenAI email generation failed:', error);
    return '';
  }
}

/**
 * Batch generate angles for multiple articles (more efficient)
 */
export async function generateBatchAngles(
  articles: Article[],
  fallbackGenerator: (article: Article) => string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const client = getOpenAIClient();

  if (!client || articles.length === 0) {
    // Use fallback for all
    for (const article of articles) {
      results.set(article.url, fallbackGenerator(article));
    }
    return results;
  }

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    const promises = batch.map(async (article) => {
      try {
        const angle = await generateEnhancedAngle(article, undefined, fallbackGenerator(article));
        return { url: article.url, angle };
      } catch {
        return { url: article.url, angle: fallbackGenerator(article) };
      }
    });

    const batchResults = await Promise.all(promises);
    
    for (const { url, angle } of batchResults) {
      results.set(url, angle);
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Summarize article for prompt (limit token usage)
 */
function summarizeArticle(article: Article): string {
  const text = article.fullText;
  
  // Take first 500 chars + last 300 chars for context
  if (text.length > 1000) {
    const start = text.substring(0, 500);
    const end = text.substring(text.length - 300);
    return `${start}\n\n[...]\n\n${end}`;
  }
  
  return text;
}

/**
 * Get competitor context for prompt
 */
function getCompetitorContext(article: Article): string {
  if (article.mentionsCompetitors.length === 0) {
    return '';
  }

  const text = article.fullText.toLowerCase();
  const mentions: string[] = [];

  for (const comp of article.mentionsCompetitors) {
    const compLower = comp.toLowerCase();
    
    // Check for negative sentiment
    const negativeIndicators = ['expensive', 'costly', 'impersonal', 'awkward', 'frustrating', 'difficult'];
    const hasNegative = negativeIndicators.some(word => {
      const compIndex = text.indexOf(compLower);
      if (compIndex === -1) return false;
      const context = text.substring(Math.max(0, compIndex - 100), Math.min(text.length, compIndex + 100));
      return context.includes(word);
    });

    if (hasNegative) {
      mentions.push(`${comp} (mentioned with negative sentiment)`);
    } else {
      mentions.push(comp);
    }
  }

  return `**Competitors Mentioned:** ${mentions.join(', ')}`;
}

/**
 * Get author context for prompt
 */
function getAuthorContext(author: AuthorContact): string {
  const details: string[] = [];

  if (author.isFreelance) {
    details.push('freelance writer (more likely to respond)');
  }
  if (author.isEditor) {
    details.push('editor (decision-maker)');
  }
  if (author.bio) {
    details.push(`Bio: ${author.bio.substring(0, 100)}...`);
  }

  if (details.length === 0) return '';
  
  return `**Author Context:** ${details.join(', ')}`;
}

/**
 * Analyze article sentiment about recruiting tech using OpenAI
 */
export async function analyzeArticleSentiment(
  article: Article
): Promise<{
  overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  keyThemes: string[];
  opportunityScore: number;
  reasoning: string;
} | null> {
  const client = getOpenAIClient();
  
  if (!client) {
    return null;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this article about recruiting/HR tech and return JSON with:
- overallSentiment: "positive", "negative", "neutral", or "mixed"
- keyThemes: array of 3-5 main themes
- opportunityScore: 1-10 (how good is this for Aligna outreach)
- reasoning: brief explanation (1-2 sentences)`,
        },
        {
          role: 'user',
          content: `Title: ${article.title}\n\nContent:\n${summarizeArticle(article)}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (error) {
    logger.error('OpenAI sentiment analysis failed:', error);
    return null;
  }
}

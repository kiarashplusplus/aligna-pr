/**
 * Outreach recommendation engine
 */

import { Article, AuthorContact, OutreachRecommendation, Priority } from '../types';
import { generateOutreachAngle, generateOpportunityReason, getCompetitorAngle } from './angle-generator';
import { generateSubject, generateEmailDraft } from './email-template';
import { analyzeArticleCompetitors, enhanceAngleWithSentiment, getCompetitorSentimentSummary } from './competitor-sentiment';
import { 
  isOpenAIConfigured, 
  generateEnhancedAngle, 
  generateEnhancedEmailDraft,
  generateBatchAngles,
  analyzeArticleSentiment,
} from './openai-angle';
import { getPriority } from '../scoring';

/**
 * Generate complete outreach recommendation
 */
export function generateOutreachRecommendation(
  article: Article,
  author: AuthorContact,
  score: number
): OutreachRecommendation {
  const priority = getPriority(score);
  const baseAngle = generateOutreachAngle(article);
  const opportunityReason = generateOpportunityReason(article, score);
  
  // Enhance angle with sentiment-aware competitor analysis
  const competitorAnalysis = analyzeArticleCompetitors(article);
  let angle = baseAngle;
  
  if (competitorAnalysis.hasCompetitorMentions && competitorAnalysis.bestAngle) {
    // Use sentiment-enhanced angle if we have negative/mixed competitor mentions
    const negativeOrMixed = competitorAnalysis.competitors.some(
      c => c.sentiment === 'negative' || c.sentiment === 'mixed'
    );
    if (negativeOrMixed) {
      angle = `${competitorAnalysis.bestAngle}\n\n${baseAngle}`;
    } else {
      // Fallback to basic competitor angle
      const competitorAngle = getCompetitorAngle(article);
      angle = competitorAngle ? `${baseAngle} ${competitorAngle}` : baseAngle;
    }
  }

  const emailDraft = generateEmailDraft(article, author, angle);
  const subject = generateSubject(article);

  // Estimate response rate
  const responseRate = estimateResponseRate(author, article, score);

  return {
    score,
    priority,
    opportunityReason,
    angle,
    suggestedSubject: subject,
    suggestedEmailDraft: emailDraft,
    contactMethod: author.bestContactMethod,
    estimatedResponseRate: responseRate,
  };
}

/**
 * Generate outreach recommendation with OpenAI-enhanced angles (async)
 * Falls back to rule-based generation if OpenAI is not configured
 */
export async function generateEnhancedOutreachRecommendation(
  article: Article,
  author: AuthorContact,
  score: number
): Promise<OutreachRecommendation> {
  const priority = getPriority(score);
  const opportunityReason = generateOpportunityReason(article, score);
  
  // Get base angle from rule-based system
  const baseAngle = generateOutreachAngle(article);
  
  // Try to enhance with OpenAI if configured
  let angle: string;
  let emailDraft: string;
  
  if (isOpenAIConfigured()) {
    // Generate enhanced angle with GPT
    angle = await generateEnhancedAngle(article, author, baseAngle);
    
    // Try to generate enhanced email draft
    const enhancedEmail = await generateEnhancedEmailDraft(article, author, angle);
    emailDraft = enhancedEmail || generateEmailDraft(article, author, angle);
  } else {
    // Fall back to competitor sentiment enhancement
    const competitorAnalysis = analyzeArticleCompetitors(article);
    angle = baseAngle;
    
    if (competitorAnalysis.hasCompetitorMentions && competitorAnalysis.bestAngle) {
      const negativeOrMixed = competitorAnalysis.competitors.some(
        c => c.sentiment === 'negative' || c.sentiment === 'mixed'
      );
      if (negativeOrMixed) {
        angle = `${competitorAnalysis.bestAngle}\n\n${baseAngle}`;
      } else {
        const competitorAngle = getCompetitorAngle(article);
        angle = competitorAngle ? `${baseAngle} ${competitorAngle}` : baseAngle;
      }
    }
    
    emailDraft = generateEmailDraft(article, author, angle);
  }

  const subject = generateSubject(article);
  const responseRate = estimateResponseRate(author, article, score);

  return {
    score,
    priority,
    opportunityReason,
    angle,
    suggestedSubject: subject,
    suggestedEmailDraft: emailDraft,
    contactMethod: author.bestContactMethod,
    estimatedResponseRate: responseRate,
  };
}

/**
 * Estimate likely response rate
 */
function estimateResponseRate(
  author: AuthorContact,
  article: Article,
  score: number
): 'high' | 'medium' | 'low' {
  let points = 0;

  // Contact method quality
  if (author.publicEmail) points += 3;
  else if (author.contactFormUrl) points += 2;
  else if (author.linkedInUrl) points += 1;

  // Author type
  if (author.isFreelance) points += 2; // Freelancers more responsive
  if (author.isEditor) points -= 1; // Editors get more pitches

  // Article signals
  if (article.contentType === 'listicle' || article.contentType === 'comparison') {
    points += 2; // More likely to accept additions
  }

  // Competitor gap
  if (article.mentionsCompetitors.length > 0) {
    points += 1; // Clear opportunity
  }

  // Score bonus
  if (score >= 75) points += 2;
  else if (score >= 60) points += 1;

  // Determine rate
  if (points >= 7) return 'high';
  if (points >= 4) return 'medium';
  return 'low';
}

/**
 * Get outreach best practices
 */
export function getOutreachBestPractices(): string {
  return `## 🚨 CRITICAL OUTREACH RULES

### DO:
✅ Personalize every email - mention specific article details
✅ Compliment genuinely - only if you actually read and appreciated it
✅ Explain the gap - why Aligna adds value to THEIR content
✅ Make it easy - provide exact text/link suggestions
✅ Respect editorial judgment - "no pressure" tone
✅ Follow up once (3-5 days later) if no response
✅ Track responses in a CRM

### DON'T:
❌ Send bulk emails - one-by-one only
❌ Use marketing jargon - be human and technical
❌ Ignore article quality - skip low-effort content
❌ Pressure or guilt-trip authors
❌ Send to spam-looking addresses
❌ Mass-follow on social media before contact
❌ Expect immediate responses - give 1-2 weeks

### RESPONSE ETIQUETTE:
- **If they say yes**: Send exact link, suggested anchor text, brief description
- **If they say no**: Thank them and move on gracefully
- **If they ignore**: One gentle follow-up, then archive
- **If they ask for more info**: Provide demo link, technical details, founder credentials`;
}

// Re-export utilities
export { generateOutreachAngle, getCompetitorAngle, generateOpportunityReason } from './angle-generator';
export { generateSubject, generateEmailDraft, generateFollowUpDraft, getResponseTemplates } from './email-template';
export { 
  analyzeArticleCompetitors, 
  getCompetitorSentimentSummary, 
  enhanceAngleWithSentiment,
  type CompetitorSentimentAnalysis,
  type ArticleCompetitorAnalysis,
  type Sentiment,
  type SentimentAspect,
} from './competitor-sentiment';
export {
  isOpenAIConfigured,
  generateEnhancedAngle,
  generateEnhancedEmailDraft,
  generateBatchAngles,
  analyzeArticleSentiment,
} from './openai-angle';

/**
 * Competitor Sentiment Analysis
 * Detects negative/positive mentions of competitors for positioning angles
 */

import { Article } from '../types';
import { ALIGNA } from '../config';

/** Sentiment classification */
export type Sentiment = 'negative' | 'neutral' | 'positive' | 'mixed';

/** Sentiment category for specific aspects */
export interface SentimentAspect {
  aspect: string;
  sentiment: Sentiment;
  keywords: string[];
  quote?: string;
}

/** Complete competitor analysis result */
export interface CompetitorSentimentAnalysis {
  competitor: string;
  mentioned: boolean;
  sentiment: Sentiment;
  aspects: SentimentAspect[];
  gapOpportunity: string;
  positioningAngle: string;
  confidence: 'high' | 'medium' | 'low';
}

/** Full article competitor analysis */
export interface ArticleCompetitorAnalysis {
  hasCompetitorMentions: boolean;
  competitors: CompetitorSentimentAnalysis[];
  overallOpportunity: string;
  suggestedAngles: string[];
  bestAngle: string | null;
}

/** Sentiment keywords organized by aspect */
const NEGATIVE_KEYWORDS = {
  cost: [
    'expensive', 'costly', 'overpriced', 'pricey', 'high cost', 'not affordable',
    'budget', 'pricing concern', 'price tag', 'cost prohibitive', 'enterprise pricing',
  ],
  experience: [
    'impersonal', 'cold', 'robotic', 'awkward', 'uncomfortable', 'stressful',
    'intimidating', 'nerve-wracking', 'anxiety', 'anxious', 'unnatural', 'weird',
    'strange', 'off-putting', 'frustrating', 'annoying', 'tedious',
  ],
  usability: [
    'clunky', 'confusing', 'difficult', 'complicated', 'hard to use', 'unintuitive',
    'buggy', 'glitchy', 'slow', 'unreliable', 'crashes', 'technical issues',
    'poor ux', 'bad interface', 'outdated',
  ],
  effectiveness: [
    'ineffective', 'doesn\'t work', 'failed', 'poor results', 'inaccurate',
    'unreliable', 'misses', 'false positive', 'false negative', 'bias', 'biased',
    'unfair', 'discriminatory',
  ],
  support: [
    'poor support', 'no support', 'unresponsive', 'slow response', 'bad customer service',
    'lack of documentation', 'hard to get help',
  ],
  limitations: [
    'limited', 'lacks', 'missing', 'doesn\'t have', 'no integration', 'can\'t',
    'unable to', 'restricted', 'basic', 'bare bones',
  ],
};

const POSITIVE_KEYWORDS = {
  cost: ['affordable', 'good value', 'reasonable', 'worth it', 'roi', 'cost-effective'],
  experience: [
    'easy', 'smooth', 'intuitive', 'user-friendly', 'pleasant', 'enjoyable',
    'natural', 'comfortable', 'seamless',
  ],
  effectiveness: [
    'effective', 'works well', 'accurate', 'reliable', 'great results', 'impressive',
    'powerful', 'robust',
  ],
  features: ['feature-rich', 'comprehensive', 'all-in-one', 'integrated', 'advanced'],
};

/** Competitor-specific positioning */
const COMPETITOR_POSITIONING: Record<string, {
  negativeAngles: Record<string, string>;
  defaultAngle: string;
  alignaAdvantage: string;
}> = {
  hirevue: {
    negativeAngles: {
      cost: 'Article notes HireVue cost concerns - Aligna offers startup-friendly pricing with transparent costs.',
      experience: 'Article mentions HireVue feels impersonal/robotic - Aligna uses live AI conversations that feel more natural than recording videos to a screen.',
      usability: 'Article highlights HireVue usability issues - Aligna is phone-first, requiring no app downloads or video setup.',
      effectiveness: 'Article questions HireVue accuracy/bias - Aligna focuses on conversational assessment with transparent AI.',
      limitations: 'Article notes HireVue limitations - Aligna addresses gaps with real-time voice interaction.',
    },
    defaultAngle: 'HireVue mentioned - position Aligna as the live conversation alternative to pre-recorded video screening.',
    alignaAdvantage: 'Live voice conversations vs. one-way video recordings',
  },
  'modern hire': {
    negativeAngles: {
      cost: 'Article mentions Modern Hire enterprise pricing - Aligna offers accessible pricing for companies of all sizes.',
      experience: 'Article notes Modern Hire candidate experience issues - Aligna\'s phone-first approach is more accessible globally.',
      usability: 'Article highlights Modern Hire complexity - Aligna simplifies with a phone-call-based experience.',
    },
    defaultAngle: 'Modern Hire mentioned - highlight Aligna\'s phone-first accessibility vs. video-heavy platforms.',
    alignaAdvantage: 'Phone accessibility without video/app requirements',
  },
  modernhire: {
    negativeAngles: {
      cost: 'Article mentions ModernHire enterprise pricing - Aligna offers accessible pricing for companies of all sizes.',
      experience: 'Article notes ModernHire candidate experience issues - Aligna\'s phone-first approach is more accessible globally.',
    },
    defaultAngle: 'ModernHire mentioned - highlight Aligna\'s phone-first accessibility vs. video-heavy platforms.',
    alignaAdvantage: 'Phone accessibility without video/app requirements',
  },
  karat: {
    negativeAngles: {
      cost: 'Article notes Karat\'s high cost for human interviewers - Aligna offers AI-powered screening at a fraction of the cost.',
      limitations: 'Article mentions Karat scalability limits - Aligna\'s AI scales infinitely without human interviewer constraints.',
    },
    defaultAngle: 'Karat mentioned - Aligna offers AI-powered screening at scale, complementing or replacing expensive human technical interviews.',
    alignaAdvantage: 'AI-powered scalability vs. human interviewer bottlenecks',
  },
  willo: {
    negativeAngles: {
      experience: 'Article notes Willo\'s async video anxiety - Aligna\'s live phone calls feel more natural than recording videos.',
      limitations: 'Article mentions Willo feature gaps - Aligna offers real-time conversation with immediate follow-up questions.',
    },
    defaultAngle: 'Willo (async video) mentioned - position Aligna as the real-time conversational alternative.',
    alignaAdvantage: 'Real-time conversation vs. pre-recorded responses',
  },
  'spark hire': {
    negativeAngles: {
      experience: 'Article mentions Spark Hire video recording stress - Aligna eliminates camera anxiety with phone-based interviews.',
      usability: 'Article notes Spark Hire technical setup issues - Aligna only requires a phone call.',
    },
    defaultAngle: 'Spark Hire mentioned - position Aligna as the phone-first alternative that eliminates video recording anxiety.',
    alignaAdvantage: 'No video recording required - just a phone call',
  },
  sparkhire: {
    negativeAngles: {
      experience: 'Article mentions SparkHire video recording stress - Aligna eliminates camera anxiety with phone-based interviews.',
    },
    defaultAngle: 'SparkHire mentioned - position Aligna as the phone-first alternative that eliminates video recording anxiety.',
    alignaAdvantage: 'No video recording required - just a phone call',
  },
  myinterview: {
    negativeAngles: {
      experience: 'Article notes MyInterview async limitations - Aligna offers real-time AI conversation.',
    },
    defaultAngle: 'MyInterview mentioned - highlight Aligna\'s live conversation vs. async video.',
    alignaAdvantage: 'Live AI conversation vs. recorded responses',
  },
  vidcruiter: {
    negativeAngles: {
      usability: 'Article mentions VidCruiter complexity - Aligna simplifies with phone-first experience.',
    },
    defaultAngle: 'VidCruiter mentioned - position Aligna as a simpler, phone-first alternative.',
    alignaAdvantage: 'Simplified phone experience vs. video platform complexity',
  },
  hireflix: {
    negativeAngles: {
      experience: 'Article notes Hireflix one-way video limitations - Aligna offers two-way AI conversation.',
    },
    defaultAngle: 'Hireflix mentioned - highlight Aligna\'s interactive conversation vs. one-way video.',
    alignaAdvantage: 'Two-way conversation vs. one-way video',
  },
};

/**
 * Normalize competitor name for lookup (remove spaces)
 */
function normalizeCompetitorName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/**
 * Find text surrounding a keyword for context
 * @param startIndex - optional starting index to search from
 */
function extractContext(text: string, keyword: string, windowSize = 100, startIndex = 0): string | undefined {
  const index = text.indexOf(keyword, startIndex);
  if (index === -1) return undefined;

  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + keyword.length + windowSize);
  
  let context = text.slice(start, end);
  
  // Clean up partial words at edges
  if (start > 0) context = '...' + context.replace(/^\S*\s/, '');
  if (end < text.length) context = context.replace(/\s\S*$/, '') + '...';
  
  return context;
}

/**
 * Analyze sentiment for a specific competitor in the text
 */
function analyzeCompetitorSentiment(text: string, competitor: string): CompetitorSentimentAnalysis {
  const compLower = competitor.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Check if competitor is mentioned
  const mentioned = textLower.includes(compLower);
  
  if (!mentioned) {
    return {
      competitor,
      mentioned: false,
      sentiment: 'neutral',
      aspects: [],
      gapOpportunity: '',
      positioningAngle: '',
      confidence: 'low',
    };
  }

  // Find the context around competitor mentions
  const contexts: string[] = [];
  let searchIndex = 0;
  while (true) {
    const index = textLower.indexOf(compLower, searchIndex);
    if (index === -1) break;
    const context = extractContext(textLower, compLower, 150, index);
    if (context) contexts.push(context);
    searchIndex = index + compLower.length;
  }
  
  const combinedContext = contexts.join(' ');
  const aspects: SentimentAspect[] = [];
  
  // Helper function to check for word with boundaries (not as substring)
  const hasWord = (text: string, word: string): boolean => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  };
  
  // Check for negative sentiment aspects
  for (const [aspect, keywords] of Object.entries(NEGATIVE_KEYWORDS)) {
    const matchedKeywords = keywords.filter(kw => hasWord(combinedContext, kw));
    if (matchedKeywords.length > 0) {
      aspects.push({
        aspect,
        sentiment: 'negative',
        keywords: matchedKeywords,
        quote: extractContext(textLower, matchedKeywords[0], 80),
      });
    }
  }
  
  // Check for positive sentiment aspects
  for (const [aspect, keywords] of Object.entries(POSITIVE_KEYWORDS)) {
    const matchedKeywords = keywords.filter(kw => hasWord(combinedContext, kw));
    if (matchedKeywords.length > 0) {
      aspects.push({
        aspect,
        sentiment: 'positive',
        keywords: matchedKeywords,
        quote: extractContext(textLower, matchedKeywords[0], 80),
      });
    }
  }
  
  // Determine overall sentiment - weight by total keyword matches, not just aspect count
  const negativeKeywordCount = aspects
    .filter(a => a.sentiment === 'negative')
    .reduce((sum, a) => sum + a.keywords.length, 0);
  const positiveKeywordCount = aspects
    .filter(a => a.sentiment === 'positive')
    .reduce((sum, a) => sum + a.keywords.length, 0);
  
  let sentiment: Sentiment;
  // Only consider 'mixed' if both have significant presence (at least 2 keywords each)
  if (negativeKeywordCount >= 2 && positiveKeywordCount >= 2) {
    sentiment = 'mixed';
  } else if (negativeKeywordCount > positiveKeywordCount) {
    sentiment = 'negative';
  } else if (positiveKeywordCount > negativeKeywordCount) {
    sentiment = 'positive';
  } else if (negativeKeywordCount > 0 && positiveKeywordCount > 0) {
    // Tie with both present but low counts - still mixed
    sentiment = 'mixed';
  } else {
    sentiment = 'neutral';
  }
  
  // Get positioning info - try both with spaces and normalized (no spaces)
  const compNormalized = normalizeCompetitorName(competitor);
  const positioning = COMPETITOR_POSITIONING[compLower] 
    || COMPETITOR_POSITIONING[compNormalized] 
    || {
      negativeAngles: {},
      defaultAngle: `${competitor} mentioned - position Aligna as a voice-first alternative.`,
      alignaAdvantage: 'Live voice AI vs. traditional video screening',
    };
  
  // Generate gap opportunity and positioning angle
  let positioningAngle = positioning.defaultAngle;
  const negativeAspects = aspects.filter(a => a.sentiment === 'negative');
  
  if (negativeAspects.length > 0) {
    // Use the first negative aspect for a targeted angle
    const firstNegative = negativeAspects[0];
    const specificAngle = positioning.negativeAngles[firstNegative.aspect];
    if (specificAngle) {
      positioningAngle = specificAngle;
    }
  }
  
  const gapOpportunity = sentiment === 'negative' 
    ? `Article expresses concerns about ${competitor} (${negativeAspects.map(a => a.aspect).join(', ')}) - opportunity to position Aligna as solving these pain points.`
    : sentiment === 'mixed'
    ? `Article has mixed views on ${competitor} - opportunity to highlight Aligna's advantages in areas where ${competitor} falls short.`
    : `${competitor} mentioned without strong sentiment - opportunity to introduce Aligna as a differentiated alternative.`;
  
  return {
    competitor,
    mentioned: true,
    sentiment,
    aspects,
    gapOpportunity,
    positioningAngle,
    confidence: aspects.length > 0 ? 'high' : 'medium',
  };
}

/**
 * Analyze all competitors mentioned in an article
 */
export function analyzeArticleCompetitors(article: Article): ArticleCompetitorAnalysis {
  const text = article.fullText;
  const competitors: CompetitorSentimentAnalysis[] = [];
  
  // Analyze each competitor
  for (const comp of ALIGNA.competitors) {
    const analysis = analyzeCompetitorSentiment(text, comp);
    if (analysis.mentioned) {
      competitors.push(analysis);
    }
  }
  
  // Sort by sentiment priority: negative > mixed > neutral > positive
  const sentimentPriority: Record<Sentiment, number> = {
    negative: 0,
    mixed: 1,
    neutral: 2,
    positive: 3,
  };
  competitors.sort((a, b) => sentimentPriority[a.sentiment] - sentimentPriority[b.sentiment]);
  
  // Generate suggested angles
  const suggestedAngles: string[] = [];
  for (const comp of competitors) {
    suggestedAngles.push(comp.positioningAngle);
  }
  
  // Determine overall opportunity
  let overallOpportunity = '';
  const negativeCompetitors = competitors.filter(c => c.sentiment === 'negative');
  const mixedCompetitors = competitors.filter(c => c.sentiment === 'mixed');
  
  if (negativeCompetitors.length > 0) {
    const names = negativeCompetitors.map(c => c.competitor).join(', ');
    overallOpportunity = `🔥 High opportunity: Article expresses negative sentiment about ${names}. Perfect positioning opportunity for Aligna.`;
  } else if (mixedCompetitors.length > 0) {
    const names = mixedCompetitors.map(c => c.competitor).join(', ');
    overallOpportunity = `✅ Good opportunity: Article has mixed views on ${names}. Highlight Aligna's strengths in weak areas.`;
  } else if (competitors.length > 0) {
    overallOpportunity = `🤔 Moderate opportunity: Competitors mentioned without strong sentiment. Introduce Aligna as a differentiated option.`;
  } else {
    overallOpportunity = 'No competitors mentioned - focus on general voice AI benefits.';
  }
  
  return {
    hasCompetitorMentions: competitors.length > 0,
    competitors,
    overallOpportunity,
    suggestedAngles,
    bestAngle: suggestedAngles[0] || null,
  };
}

/**
 * Get a quick sentiment summary for an article
 */
export function getCompetitorSentimentSummary(article: Article): string {
  const analysis = analyzeArticleCompetitors(article);
  
  if (!analysis.hasCompetitorMentions) {
    return 'No competitor mentions detected.';
  }
  
  const parts: string[] = [];
  
  for (const comp of analysis.competitors) {
    const emoji = comp.sentiment === 'negative' ? '🔴' 
      : comp.sentiment === 'mixed' ? '🟡' 
      : comp.sentiment === 'positive' ? '🟢' 
      : '⚪';
    
    const aspectSummary = comp.aspects.length > 0
      ? ` (${comp.aspects.map(a => `${a.sentiment} on ${a.aspect}`).join(', ')})`
      : '';
    
    parts.push(`${emoji} ${comp.competitor}: ${comp.sentiment}${aspectSummary}`);
  }
  
  return parts.join('\n');
}

/**
 * Enhance outreach angle with sentiment-aware positioning
 */
export function enhanceAngleWithSentiment(baseAngle: string, article: Article): string {
  const analysis = analyzeArticleCompetitors(article);
  
  if (!analysis.hasCompetitorMentions) {
    return baseAngle;
  }
  
  // Find the highest-priority competitor angle (negative sentiment first)
  const negativeComp = analysis.competitors.find(c => c.sentiment === 'negative');
  
  if (negativeComp) {
    // Prepend sentiment-specific angle
    return `${negativeComp.positioningAngle}\n\n${baseAngle}`;
  }
  
  return baseAngle;
}

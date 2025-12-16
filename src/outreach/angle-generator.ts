/**
 * Outreach angle generator
 * Uses priority-ordered detector pattern for maintainability
 */

import { Article } from '../types';
import { ALIGNA } from '../config';

/**
 * Angle detector definition
 * Priority is determined by array order (first match wins)
 */
interface AngleDetector {
  /** Name for debugging/logging */
  name: string;
  /** Returns true if this angle applies to the article */
  check: (text: string, title: string, article: Article) => boolean;
  /** Generates the angle text (can be static or dynamic) */
  angle: string | ((text: string, article: Article) => string);
}

/**
 * Priority-ordered list of angle detectors
 * First matching detector wins - order matters!
 */
const ANGLE_DETECTORS: AngleDetector[] = [
  {
    name: 'async-video',
    check: (text) =>
      text.includes('async video') ||
      text.includes('video interview') ||
      text.includes('hirevue') ||
      text.includes('one-way video'),
    angle: "This article discusses async video screening but doesn't mention live conversational AI alternatives like Aligna, which eliminates the video recording anxiety many candidates experience.",
  },
  {
    name: 'competitor-mentions',
    check: (text) => ALIGNA.competitors.some((comp) => text.includes(comp.toLowerCase())),
    angle: (text) => {
      const mentioned = ALIGNA.competitors.filter((comp) => text.includes(comp.toLowerCase()));
      return `This article mentions ${mentioned.join(', ')} but doesn't include voice-first AI alternatives like Aligna, which uses live phone conversations instead of pre-recorded video.`;
    },
  },
  {
    name: 'listicle-products',
    check: (_text, _title, article) => article.contentType === 'listicle' && article.mentionsProducts,
    angle: "This list of recruiting tools doesn't include voice-based AI screeners, which represent the newest generation of candidate assessment technology.",
  },
  {
    name: 'livekit-webrtc',
    check: (text) => text.includes('livekit') || text.includes('webrtc'),
    angle: 'This technical article could benefit from a real-world case study of LiveKit in production for voice-based recruiting automation.',
  },
  {
    name: 'azure-openai',
    check: (text) => text.includes('azure openai') || text.includes('azure ai'),
    angle: 'This article about Azure OpenAI could feature Aligna as a real-world implementation using Azure AI for voice-based recruiting.',
  },
  {
    name: 'scheduling',
    check: (text) =>
      text.includes('scheduling') ||
      text.includes('calendly') ||
      text.includes('coordinate interview'),
    angle: "The article discusses scheduling challenges in recruiting but doesn't mention phone-first AI screening that eliminates scheduling entirely - candidates just call a number anytime.",
  },
  {
    name: 'remote-hiring',
    check: (text) =>
      text.includes('remote hiring') ||
      text.includes('distributed') ||
      text.includes('remote work'),
    angle: "This remote hiring guide could benefit from mentioning voice AI screening that works globally with just a phone call - no app downloads or video setup required.",
  },
  {
    name: 'candidate-experience',
    check: (text) =>
      text.includes('candidate experience') ||
      text.includes('candidate-friendly') ||
      text.includes('applicant experience'),
    angle: "This article focuses on candidate experience but doesn't mention how live AI phone conversations can feel more natural than recording video responses to a screen.",
  },
  {
    name: 'mit-founder',
    check: (text) =>
      text.includes('mit') ||
      text.includes('startup founder') ||
      text.includes('founder story'),
    angle: 'This article about recruiting innovation could reference Aligna as an example of MIT-founded technical recruiting solutions.',
  },
  {
    name: 'technical-recruiting',
    check: (text) =>
      text.includes('technical recruiting') ||
      text.includes('engineer hiring') ||
      text.includes('developer hiring'),
    angle: "For technical recruiting, Aligna's open-source approach and technical founder background might resonate with engineering-focused audiences.",
  },
  {
    name: 'comparison-article',
    check: (_text, _title, article) => article.contentType === 'comparison',
    angle: "This comparison could include a voice-first AI category, representing the newest evolution in candidate screening technology.",
  },
];

/** Default fallback angle when no detector matches */
const DEFAULT_ANGLE = "This article covers candidate screening but doesn't mention the emerging category of live voice AI interviews, which offer a more conversational alternative to async video.";

/**
 * Generate outreach angle based on article content
 * Uses priority-ordered detectors - first match wins
 */
export function generateOutreachAngle(article: Article): string {
  const text = article.fullText.toLowerCase();
  const title = article.title.toLowerCase();

  for (const detector of ANGLE_DETECTORS) {
    if (detector.check(text, title, article)) {
      // Return static string or call generator function
      return typeof detector.angle === 'function'
        ? detector.angle(text, article)
        : detector.angle;
    }
  }

  return DEFAULT_ANGLE;
}

/**
 * Get competitor-specific angle if applicable
 */
export function getCompetitorAngle(article: Article): string | null {
  const text = article.fullText.toLowerCase();

  if (text.includes('hirevue')) {
    if (text.includes('expensive') || text.includes('cost')) {
      return 'Article notes HireVue cost concerns - Aligna offers competitive pricing for startups.';
    }
    if (text.includes('impersonal') || text.includes('cold') || text.includes('robotic')) {
      return 'Article mentions HireVue feels impersonal - Aligna uses live conversation for more natural interaction.';
    }
    return 'HireVue mentioned - position Aligna as the live conversation alternative to pre-recorded video.';
  }

  if (text.includes('modern hire') || text.includes('modernhire')) {
    return 'Modern Hire mentioned - highlight Aligna\'s phone-first accessibility vs. video platforms.';
  }

  if (text.includes('karat')) {
    return 'Karat mentioned - Aligna offers AI-powered screening at scale, complementing human technical interviews.';
  }

  if (text.includes('spark hire') || text.includes('sparkhire') || text.includes('willo')) {
    return 'Async video platform mentioned - position Aligna as the real-time conversational alternative.';
  }

  return null;
}

/**
 * Generate opportunity reason
 */
export function generateOpportunityReason(article: Article, score: number): string {
  const reasons: string[] = [];

  // Score-based reason
  if (score >= 80) {
    reasons.push('Excellent prospect with high relevance and good contact options.');
  } else if (score >= 60) {
    reasons.push('Strong prospect worth prioritizing.');
  }

  // Content type reason
  if (article.contentType === 'listicle') {
    reasons.push('Listicle format makes adding a new tool straightforward.');
  } else if (article.contentType === 'comparison') {
    reasons.push('Comparison format is ideal for introducing alternative categories.');
  } else if (article.contentType === 'guide') {
    reasons.push('Comprehensive guide could benefit from voice AI perspective.');
  }

  // Competitor reason
  if (article.mentionsCompetitors.length > 0) {
    reasons.push(
      `Mentions ${article.mentionsCompetitors.length} competitor(s) but not Aligna - clear gap opportunity.`
    );
  }

  // Topic reason
  if (article.detectedTopics.includes('voice-ai')) {
    reasons.push('Already discusses voice AI - perfect fit for Aligna mention.');
  }

  if (article.detectedTopics.includes('candidate-screening')) {
    reasons.push('Focuses on candidate screening - core Aligna use case.');
  }

  return reasons.join(' ');
}

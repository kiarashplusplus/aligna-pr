/**
 * Outreach angle generator
 */

import { Article } from '../types';
import { ALIGNA } from '../config';

/**
 * Generate outreach angle based on article content
 */
export function generateOutreachAngle(article: Article): string {
  const text = article.fullText.toLowerCase();
  const title = article.title.toLowerCase();

  // Angle 1: Missing voice/conversational AI
  if (
    text.includes('async video') ||
    text.includes('video interview') ||
    text.includes('hirevue') ||
    text.includes('one-way video')
  ) {
    return "This article discusses async video screening but doesn't mention live conversational AI alternatives like Aligna, which eliminates the video recording anxiety many candidates experience.";
  }

  // Angle 2: Mentions competitors specifically
  const mentionedCompetitors = ALIGNA.competitors.filter((comp) =>
    text.includes(comp.toLowerCase())
  );
  if (mentionedCompetitors.length > 0) {
    const competitorNames = mentionedCompetitors.join(', ');
    return `This article mentions ${competitorNames} but doesn't include voice-first AI alternatives like Aligna, which uses live phone conversations instead of pre-recorded video.`;
  }

  // Angle 3: Incomplete comparison/list
  if (article.contentType === 'listicle' && article.mentionsProducts) {
    return "This list of recruiting tools doesn't include voice-based AI screeners, which represent the newest generation of candidate assessment technology.";
  }

  // Angle 4: Technical depth opportunity (LiveKit, Azure OpenAI)
  if (text.includes('livekit') || text.includes('webrtc')) {
    return 'This technical article could benefit from a real-world case study of LiveKit in production for voice-based recruiting automation.';
  }

  if (text.includes('azure openai') || text.includes('azure ai')) {
    return 'This article about Azure OpenAI could feature Aligna as a real-world implementation using Azure AI for voice-based recruiting.';
  }

  // Angle 5: Solving the scheduling problem
  if (
    text.includes('scheduling') ||
    text.includes('calendly') ||
    text.includes('coordinate interview')
  ) {
    return "The article discusses scheduling challenges in recruiting but doesn't mention phone-first AI screening that eliminates scheduling entirely - candidates just call a number anytime.";
  }

  // Angle 6: Remote hiring focus
  if (text.includes('remote hiring') || text.includes('distributed') || text.includes('remote work')) {
    return "This remote hiring guide could benefit from mentioning voice AI screening that works globally with just a phone call - no app downloads or video setup required.";
  }

  // Angle 7: Candidate experience focus
  if (
    text.includes('candidate experience') ||
    text.includes('candidate-friendly') ||
    text.includes('applicant experience')
  ) {
    return "This article focuses on candidate experience but doesn't mention how live AI phone conversations can feel more natural than recording video responses to a screen.";
  }

  // Angle 8: MIT/startup founder credibility
  if (text.includes('mit') || text.includes('startup founder') || text.includes('founder story')) {
    return 'This article about recruiting innovation could reference Aligna as an example of MIT-founded technical recruiting solutions.';
  }

  // Angle 9: Technical recruiting focus
  if (text.includes('technical recruiting') || text.includes('engineer hiring') || text.includes('developer hiring')) {
    return "For technical recruiting, Aligna's open-source approach and technical founder background might resonate with engineering-focused audiences.";
  }

  // Angle 10: Comparison article
  if (article.contentType === 'comparison') {
    return "This comparison could include a voice-first AI category, representing the newest evolution in candidate screening technology.";
  }

  // Generic fallback
  return "This article covers candidate screening but doesn't mention the emerging category of live voice AI interviews, which offer a more conversational alternative to async video.";
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

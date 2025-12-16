/**
 * Email template generator for personalized outreach
 */

import { Article, AuthorContact, ContentType } from '../types';
import { ALIGNA } from '../config';

/**
 * Generate email subject line based on article type
 */
export function generateSubject(article: Article): string {
  const contentTypeSubjects: Record<ContentType, string> = {
    listicle: 'Addition to your recruiting tools article',
    comparison: 'New alternative for your recruiting platform comparison',
    guide: 'Voice AI perspective for your recruiting guide',
    'case-study': 'Related case study for your recruiting feature',
    tutorial: 'Complementary tool for your recruiting tutorial',
    news: 'Thought on your recruiting tech coverage',
    opinion: 'Thought on your article about recruiting automation',
  };

  return contentTypeSubjects[article.contentType] || 'Thought on your recruiting article';
}

/**
 * Generate specific value proposition based on article content
 */
export function generateSpecificValue(article: Article): string {
  const text = article.fullText.toLowerCase();

  // HireVue or async video context
  if (text.includes('hirevue') || text.includes('async video')) {
    return "For your readers evaluating async video tools, Aligna offers a phone-first alternative that many candidates find less intimidating than recording video responses.";
  }

  // Scheduling context
  if (text.includes('scheduling') || text.includes('calendly') || text.includes('coordinate')) {
    return "Since your article highlights scheduling challenges, Aligna's approach of 'call anytime' might resonate with your audience - no booking required.";
  }

  // Technical/developer context
  if (text.includes('developer') || text.includes('technical') || text.includes('engineer')) {
    return "For technical recruiting (which your article focuses on), our open-source approach and MIT founder background might add credibility.";
  }

  // Remote work context
  if (text.includes('remote') || text.includes('distributed')) {
    return "For remote hiring, Aligna's phone-first approach works globally without requiring candidates to download apps or set up video.";
  }

  // Candidate experience context
  if (text.includes('candidate experience') || text.includes('applicant')) {
    return "Given your focus on candidate experience, the conversational nature of live AI phone calls tends to feel more natural than talking to a camera.";
  }

  // Startup context
  if (text.includes('startup') || text.includes('scale')) {
    return "For startups scaling hiring, Aligna automates phone screens while maintaining the conversational quality candidates expect.";
  }

  // Default value prop
  return "Given your focus on recruiting innovation, this might be a useful addition for your readers exploring modern screening approaches.";
}

/**
 * Generate the ask based on article type
 */
export function generateAsk(article: Article, author: AuthorContact): string {
  if (article.contentType === 'listicle') {
    return "Would you consider adding Aligna to your list, or would a separate mention in a relevant section make sense?";
  }

  if (article.contentType === 'comparison') {
    return "Would it make sense to add Aligna as an alternative in your comparison, especially in a 'live voice AI' category?";
  }

  if (article.lastUpdated) {
    return "If you update this article in the future, would mentioning voice-first AI screening fit your narrative?";
  }

  if (author.isFreelance) {
    return "If this resonates, I'd be happy to provide any additional details that might be helpful for your writing.";
  }

  if (author.isEditor) {
    return "If this fits your editorial direction, I'd be glad to provide more information or arrange a demo.";
  }

  return "Would a reference to Aligna as an example of conversational AI in recruiting be useful for your readers?";
}

/**
 * Generate complete personalized email draft
 */
export function generateEmailDraft(
  article: Article,
  author: AuthorContact,
  angle: string
): string {
  const firstName = author.name.split(' ')[0] || 'there';
  const subject = generateSubject(article);
  const specificValue = generateSpecificValue(article);
  const ask = generateAsk(article, author);

  const differentiators = ALIGNA.differentiators
    .map((d) => `• ${d}`)
    .join('\n');

  return `Subject: ${subject}

Hi ${firstName},

I recently read your article "${article.title}" on ${article.publicationName} and found it really insightful [SPECIFIC COMPLIMENT ABOUT THEIR WORK - e.g., "particularly your point about candidate experience in async screening"].

${angle}

I'm reaching out because we recently launched Aligna (${ALIGNA.url}), a conversational AI recruiter that conducts live phone interviews instead of async video screening. Some key differentiators:

${differentiators}

${specificValue}

${ask}

I completely understand if this doesn't fit your editorial direction. Either way, thanks for writing great content about recruiting innovation.

Best,
[Your Name]
Aligna Team

---
📞 Live demo: ${ALIGNA.url}
🔧 Built by ${ALIGNA.founder.credentials} ${ALIGNA.founder.name}
`.trim();
}

/**
 * Generate shorter follow-up email
 */
export function generateFollowUpDraft(
  article: Article,
  author: AuthorContact
): string {
  const firstName = author.name.split(' ')[0] || 'there';

  return `Subject: Re: ${generateSubject(article)}

Hi ${firstName},

Just wanted to follow up on my previous note about your "${article.title}" article.

I mentioned Aligna as a potential addition - we're a live voice AI interviewing platform (vs. async video). Happy to provide any details if you're interested.

No worries if not a fit - thanks for considering!

Best,
[Your Name]
`.trim();
}

/**
 * Get response templates
 */
export function getResponseTemplates(): Record<string, string> {
  return {
    ifYes: `Thanks so much for considering Aligna!

Here are the details for the addition:

**Aligna** - Live Voice AI Recruiting
- Website: ${ALIGNA.url}
- One-liner: Conversational AI recruiter that conducts live phone interviews, replacing async video screening with real-time AI-powered conversations.
- Key features: Real-time voice AI, phone-first (no app needed), eliminates scheduling, dual-sided (candidates and employers)
- Suggested anchor text: "Aligna" or "voice AI recruiting"

Let me know if you need anything else!`,

    ifNo: `Thanks for taking the time to consider and respond. I completely understand - your editorial judgment is what makes the content valuable.

Keep up the great work on your recruiting coverage!`,

    ifMoreInfo: `Happy to share more!

**Quick Overview:**
- Aligna conducts live phone interviews using conversational AI
- Built on LiveKit + Azure OpenAI for real-time voice
- Candidates just call a number - no video recording or scheduling
- Founded by ${ALIGNA.founder.name} (${ALIGNA.founder.credentials})

**Demo:** ${ALIGNA.url}

**Technical:** We're building in TypeScript/Node.js with a Python-based LiveKit voice agent. Happy to discuss architecture if relevant.

Would a quick call be helpful, or is there specific info I can provide?`,
  };
}

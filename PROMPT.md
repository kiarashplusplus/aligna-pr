# Backlink & PR Prospecting Tool - AI Agent Prompt

## Mission

Build an intelligent, ethical PR prospecting tool that identifies high-quality backlink opportunities for **Aligna** (https://www.align-a.com) — a conversational AI recruiter platform that conducts live voice interviews over the phone, replacing traditional async video screening with real-time AI-powered conversations.

This tool is designed for **thoughtful, manual outreach**, not bulk spam. Quality over quantity.

---

## Understanding Aligna: What Makes It Unique

Before searching for opportunities, understand what makes Aligna different:

### Core Technology
- **Live Voice AI Interviews**: Real-time phone conversations using LiveKit voice agents, not pre-recorded video responses
- **Azure OpenAI Integration**: GPT-5 powered conversation, transcript analysis, and intelligent candidate matching
- **Python-based LiveKit Agents**: Conducts structured interviews with consent management
- **Bi-directional Matching**: Automatic skill-based scoring between candidates and jobs
- **Privacy-First Architecture**: Encrypted phone numbers, explicit consent capture, GDPR-compliant data deletion

### Technical Stack
- **Backend**: TypeScript/Node.js with Express, Prisma ORM, PostgreSQL
- **Frontend**: Next.js 16, React, responsive design
- **Voice Infrastructure**: LiveKit for real-time WebRTC, phone number integration
- **AI/ML**: Azure OpenAI (STT, TTS, GPT-5), embeddings, reranking
- **Queue System**: Azure Service Bus for async matching and transcription jobs
- **Monitoring**: Sentry error tracking, Prometheus metrics, structured logging

### Key Differentiators
1. **Real-time conversational AI** vs. one-way video submissions (e.g., HireVue)
2. **Phone-first accessibility** - candidates just call a number
3. **Live AI phone screening** eliminates scheduling complexity
4. **Built by MIT founder** (Kiarash Adl - kiarasha@alum.mit.edu) with deep technical credibility
5. **Open-source friendly** - monorepo showcases technical implementation
6. **Dual-sided platform**: Candidates apply via AI calls, employers post jobs via AI calls

### Problem Space Aligna Solves
- **Replaces**: Async video screening, manual phone screens, resume parsing
- **Improves**: Candidate experience (no video recording anxiety), recruiter efficiency (no manual screening)
- **Targets**: Tech recruiting, high-volume hiring, remote-first companies

---

## 1️⃣ Article Discovery & Search Strategy

### Primary Search Queries

Craft search queries targeting these content categories:

#### A. Conversational AI & Voice AI in Hiring
- "conversational AI recruiting" OR "voice AI interviews"
- "AI phone screening tools" OR "automated phone interviews"
- "live AI interviewer" OR "real-time AI recruiting"
- "voice-first recruiting technology"
- "alternatives to HireVue" OR "alternatives to async video interviews"
- "LiveKit recruiting applications"

#### B. Candidate Screening & Assessment
- "candidate screening automation"
- "AI-powered candidate assessment"
- "phone screen automation"
- "interview scheduling alternatives"
- "pre-screening candidates with AI"
- "technical recruiting tools 2024" OR "technical recruiting tools 2025"

#### C. HR Tech & ATS Ecosystem
- "ATS alternatives" OR "modern applicant tracking"
- "recruiting tech stack"
- "hiring automation tools"
- "best recruiting software for startups"
- "AI recruiting platforms comparison"

#### D. Remote & Async Work Trends
- "remote hiring best practices"
- "async interview tools"
- "phone-first recruiting"
- "eliminating scheduling in hiring"

#### E. Emerging Tech & AI Trends
- "Azure OpenAI applications in HR"
- "GPT-5 use cases" OR "GPT-4 recruiting"
- "AI voice agents for business"
- "WebRTC recruiting applications"

### Search Source Diversity

Use multiple sources to maximize coverage:

1. **General Search Engines**
   - Google Search API (News, Blogs, All)
   - Bing Search API
   - DuckDuckGo (privacy-focused audiences)

2. **Developer & Tech Blogs**
   - dev.to (tag: recruiting, ai, voice)
   - Medium (publications: Better Programming, The Startup, Towards Data Science)
   - Substack newsletters about HR tech or AI
   - HashNode blogs

3. **HR Tech & Business Publications**
   - HR Technologist
   - Recruiting Daily
   - ERE Media
   - TLNT (Talent Management)
   - HR Dive

4. **VC & Startup Ecosystems**
   - a16z blog (future of work)
   - Y Combinator Hacker News (search "recruiting" discussions)
   - First Round Review
   - TechCrunch HR tech coverage

5. **Product Comparison Sites**
   - G2 blog posts
   - Capterra resources
   - Software Advice articles
   - AlternativeTo community posts

6. **Technical Communities**
   - Reddit: r/recruiting, r/TechRecruiting, r/startups
   - Hacker News: search for "recruiting tools" discussions
   - Indie Hackers: hiring automation topics

### Content Freshness Strategy

Target both recent and evergreen content:
- **Recent** (last 6 months): Capture emerging trends, "best tools for 2024/2025" lists
- **Evergreen** (1-3 years old): High-value guides frequently updated ("Updated: March 2024" signals)
- **Flag old but active**: Articles with update dates, active comment sections

### Article Data Extraction

For each discovered article, extract and structure:

```typescript
interface Article {
  // Core metadata
  title: string;
  url: string;
  publicationName: string; // e.g., "Medium", "TechCrunch", "dev.to"
  publishDate: Date | null;
  lastUpdated: Date | null; // Important for evergreen content
  
  // Content
  fullText: string; // Cleaned, main content only (no ads/navigation)
  excerpt: string; // First 200 characters
  wordCount: number;
  
  // Classification
  detectedTopics: string[]; // e.g., ["voice-ai", "candidate-screening", "livekit"]
  contentType: "listicle" | "guide" | "comparison" | "case-study" | "news" | "opinion" | "tutorial";
  mentionsProducts: boolean; // Does it reference specific tools?
  mentionsCompetitors: string[]; // HireVue, Karat, Modern Hire, etc.
  
  // Technical metadata
  domain: string;
  domainAuthority?: number; // If available from SEO tools
}
```

---

## 2️⃣ Author & Contact Extraction

For each article, intelligently extract contact information:

### Author Information Schema

```typescript
interface AuthorContact {
  // Identity
  name: string;
  bio?: string; // From author page
  title?: string; // "Senior Editor", "Freelance Writer"
  
  // Social & Web Presence
  authorWebsite?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  githubUsername?: string; // For technical writers
  
  // Contact Methods
  publicEmail?: string; // Only if explicitly published
  contactFormUrl?: string; // Author website contact page
  
  // Context
  isFreelance: boolean; // vs. staff writer
  isEditor: boolean;
  worksForPublication: string; // Publication name
  
  // Inferred contact strategy
  bestContactMethod: "email" | "linkedin-dm" | "twitter-dm" | "contact-form" | "unknown";
  contactNotes: string; // e.g., "Has contact form on personal site"
}
```

### Extraction Strategy

1. **On-Page Extraction**
   - Parse author byline and metadata
   - Look for author bio sections
   - Scan for social media icons/links near author name
   - Check article footer for contact information

2. **Author Page Investigation**
   - Follow author profile links (e.g., Medium/@username, dev.to/@username)
   - Parse author bio for social links and websites
   - Check for explicitly listed email addresses

3. **Publication Contact Research**
   - Check publication's "Write for Us" or "Pitch" pages
   - Find editorial contact information
   - Identify section editors (e.g., HR Tech Editor)

4. **Social Profile Enrichment**
   - If LinkedIn found: Check for "Open to opportunities" or DM availability
   - If Twitter/X found: Check for DMs open or email in bio
   - If personal website found: Look for /contact, /about, /hire-me pages

5. **Email Discovery Rules**
   - **ONLY** extract emails explicitly published on public pages
   - **NEVER** guess email formats (firstname.lastname@domain.com)
   - **NEVER** use email finding tools or databases
   - Mark as "no public email" if not found

6. **Contact Method Prioritization**
   ```typescript
   function determineContactMethod(author: AuthorContact): string {
     if (author.publicEmail) return "email";
     if (author.contactFormUrl) return "contact-form";
     if (author.linkedInUrl && author.isFreelance) return "linkedin-dm";
     if (author.twitterHandle) return "twitter-dm";
     return "unknown";
   }
   ```

---

## 3️⃣ Relevance & Outreach Scoring System

Implement a **0-100 scoring algorithm** to prioritize outreach efforts.

### Scoring Formula

```typescript
interface ScoringFactors {
  topicalRelevance: number;      // 0-30 points
  articleQuality: number;         // 0-20 points
  updateability: number;          // 0-20 points
  authorCredibility: number;      // 0-15 points
  competitiveGap: number;         // 0-10 points
  reachability: number;           // 0-5 points
}

function calculateScore(article: Article, author: AuthorContact): number {
  // Detailed breakdown below
  const factors: ScoringFactors = {
    topicalRelevance: scoreTopicalRelevance(article),
    articleQuality: scoreArticleQuality(article),
    updateability: scoreUpdateability(article),
    authorCredibility: scoreAuthorCredibility(author, article),
    competitiveGap: scoreCompetitiveGap(article),
    reachability: scoreReachability(author)
  };
  
  return Object.values(factors).reduce((sum, score) => sum + score, 0);
}
```

### Factor 1: Topical Relevance (0-30 points)

**Scoring Logic:**
- **Perfect Match (25-30 points)**: Article explicitly discusses:
  - Conversational AI in recruiting
  - Voice AI for interviews
  - Phone-based screening automation
  - LiveKit or similar real-time voice platforms
  
- **Strong Match (18-24 points)**: Article covers:
  - AI-powered candidate screening (general)
  - Alternatives to async video interviews
  - Recruiting automation with AI
  - Technical recruiting tools
  
- **Moderate Match (10-17 points)**: Article discusses:
  - General HR tech trends
  - ATS systems and integrations
  - Remote hiring best practices
  - AI in talent acquisition
  
- **Weak Match (0-9 points)**: Tangentially related:
  - General AI trends (not recruiting-specific)
  - HR management tools (not candidate-facing)
  - Only mentions "AI" in passing

**Implementation:**
```typescript
function scoreTopicalRelevance(article: Article): number {
  const text = article.fullText.toLowerCase();
  const title = article.title.toLowerCase();
  
  // Perfect match keywords
  const perfectKeywords = [
    "conversational ai interview", "voice ai recruiting",
    "live ai phone screen", "real-time ai interview",
    "livekit", "ai phone screening"
  ];
  
  // Strong match keywords
  const strongKeywords = [
    "candidate screening ai", "interview automation",
    "hirevue alternative", "async video alternative",
    "ai recruiter", "automated phone screen"
  ];
  
  // Check title (higher weight) and body
  let score = 0;
  if (perfectKeywords.some(kw => title.includes(kw))) score += 30;
  else if (perfectKeywords.some(kw => text.includes(kw))) score += 25;
  else if (strongKeywords.some(kw => title.includes(kw))) score += 22;
  else if (strongKeywords.some(kw => text.includes(kw))) score += 18;
  else if (article.detectedTopics.includes("candidate-screening")) score += 12;
  else if (article.detectedTopics.includes("hr-tech")) score += 8;
  
  return Math.min(score, 30);
}
```

### Factor 2: Article Quality (0-20 points)

**Scoring Criteria:**
- **Content Depth**: Long-form (2000+ words) > Short posts (500 words)
- **Structure**: Includes products/examples > Generic advice
- **Publication Authority**: Major tech blog > Personal blog (but both valuable!)
- **Engagement**: Active comments/shares indicate influence

```typescript
function scoreArticleQuality(article: Article): number {
  let score = 0;
  
  // Word count (0-8 points)
  if (article.wordCount > 2500) score += 8;
  else if (article.wordCount > 1500) score += 6;
  else if (article.wordCount > 800) score += 4;
  else score += 2;
  
  // Content type (0-7 points)
  if (article.contentType === "guide") score += 7;
  else if (article.contentType === "comparison") score += 7;
  else if (article.contentType === "listicle") score += 6;
  else if (article.contentType === "case-study") score += 5;
  else score += 3;
  
  // Mentions products (0-5 points)
  if (article.mentionsProducts) score += 5;
  
  return Math.min(score, 20);
}
```

### Factor 3: Updateability (0-20 points)

**Key Question**: How likely is the author to add or update content?

```typescript
function scoreUpdateability(article: Article): number {
  let score = 0;
  const text = article.fullText.toLowerCase();
  
  // Explicit update signals (10 points)
  if (/last updated|updated:/i.test(text)) score += 10;
  if (/\bupdated (january|february|march|april|may|june|july|august|september|october|november|december) 202[3-5]/i.test(text)) score += 5;
  
  // Content type (0-10 points)
  if (article.contentType === "listicle") score += 8; // "Top 10 tools"
  if (article.contentType === "guide") score += 7; // "Complete guide"
  if (article.contentType === "comparison") score += 9; // "Tool A vs B vs C"
  
  // Freshness indicator (0-5 points)
  const monthsSincePublish = article.publishDate 
    ? (Date.now() - article.publishDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 999;
  
  if (monthsSincePublish < 6) score += 5;
  else if (monthsSincePublish < 12) score += 3;
  else if (monthsSincePublish < 24) score += 1;
  
  // Penalty for very old, never-updated content
  if (monthsSincePublish > 36 && !article.lastUpdated) score = Math.max(0, score - 10);
  
  return Math.min(score, 20);
}
```

### Factor 4: Author Credibility (0-15 points)

**Independent writers and subject matter experts score higher** (more likely to accept suggestions).

```typescript
function scoreAuthorCredibility(author: AuthorContact, article: Article): number {
  let score = 0;
  
  // Author type (0-8 points)
  if (author.isFreelance) score += 8; // Freelancers more flexible
  else if (author.isEditor) score += 4; // Editors have power but less flexible
  else score += 6; // Staff writers middle ground
  
  // Subject matter expertise (0-4 points)
  const bio = (author.bio || "").toLowerCase();
  if (bio.includes("hr tech") || bio.includes("recruiting")) score += 4;
  else if (bio.includes("tech") || bio.includes("ai")) score += 3;
  else if (bio.includes("writer") || bio.includes("journalist")) score += 2;
  
  // Publication quality (0-3 points)
  const majorPubs = ["techcrunch", "medium", "dev.to", "hacker news"];
  if (majorPubs.some(pub => article.publicationName.toLowerCase().includes(pub))) score += 3;
  else score += 1;
  
  return Math.min(score, 15);
}
```

### Factor 5: Competitive Gap (0-10 points)

**Bonus points if the article mentions competitors but not Aligna** — clear addition opportunity.

```typescript
function scoreCompetitiveGap(article: Article): number {
  let score = 0;
  const text = article.fullText.toLowerCase();
  
  // Mentions competitors
  const competitors = ["hirevue", "modern hire", "karat", "willo", "spark hire", "myinterview"];
  const mentionsCompetitor = competitors.some(comp => text.includes(comp.toLowerCase()));
  
  // Mentions Aligna (negative signal)
  const mentionsAligna = text.includes("aligna") || text.includes("align-a");
  
  if (mentionsCompetitor && !mentionsAligna) score += 10;
  else if (article.contentType === "comparison" && !mentionsAligna) score += 8;
  else if (article.mentionsProducts && !mentionsAligna) score += 5;
  
  return score;
}
```

### Factor 6: Reachability (0-5 points)

```typescript
function scoreReachability(author: AuthorContact): number {
  if (author.publicEmail) return 5;
  if (author.contactFormUrl) return 4;
  if (author.linkedInUrl) return 3;
  if (author.twitterHandle) return 2;
  return 0; // Unknown contact method
}
```

### Score Interpretation

- **80-100**: 🔥 **Excellent Target** - Reach out ASAP
- **60-79**: ✅ **Strong Prospect** - High priority
- **40-59**: 🤔 **Moderate Fit** - Consider if bandwidth allows
- **20-39**: 🤷 **Weak Match** - Low priority, manual review
- **0-19**: ❌ **Skip** - Not worth the effort

---

## 4️⃣ Outreach Recommendation Engine

For articles scoring **60+**, generate personalized outreach materials.

### Outreach Angle Generator

```typescript
interface OutreachRecommendation {
  score: number;
  priority: "excellent" | "strong" | "moderate";
  
  // Why this is a good opportunity
  opportunityReason: string; // 1-2 sentences
  
  // Specific gap or angle
  angle: string; // What's missing that Aligna provides
  
  // Suggested outreach
  suggestedSubject: string;
  suggestedEmailDraft: string;
  
  // Metadata
  contactMethod: string;
  estimatedResponseRate: "high" | "medium" | "low";
}
```

### Angle Detection Logic

```typescript
function generateOutreachAngle(article: Article): string {
  const text = article.fullText.toLowerCase();
  const title = article.title.toLowerCase();
  
  // Angle 1: Missing voice/conversational AI
  if (text.includes("async video") || text.includes("hirevue")) {
    return "This article discusses async video screening but doesn't mention live conversational AI alternatives like Aligna, which eliminates the video recording anxiety many candidates experience.";
  }
  
  // Angle 2: Incomplete comparison/list
  if (article.contentType === "listicle" && article.mentionsProducts) {
    return "This list of recruiting tools doesn't include voice-based AI screeners, which represent the newest generation of candidate assessment technology.";
  }
  
  // Angle 3: Technical depth opportunity
  if (text.includes("livekit") || text.includes("azure openai")) {
    return "This technical article could benefit from a real-world case study of LiveKit + Azure OpenAI in production for recruiting automation.";
  }
  
  // Angle 4: Solving the scheduling problem
  if (text.includes("scheduling") || text.includes("calendly")) {
    return "The article discusses scheduling challenges in recruiting but doesn't mention phone-first AI screening that eliminates scheduling entirely.";
  }
  
  // Angle 5: MIT founder credibility
  if (text.includes("startup") || text.includes("founder")) {
    return "This article about recruiting innovation could reference Aligna as an example of MIT-founded technical recruiting solutions.";
  }
  
  // Generic fallback
  return "This article covers candidate screening but doesn't mention the emerging category of live voice AI interviews.";
}
```

### Email Draft Template System

Generate personalized drafts using this structure:

```typescript
function generateEmailDraft(article: Article, author: AuthorContact, angle: string): string {
  const authorFirstName = author.name.split(" ")[0];
  
  return `
Subject: ${generateSubject(article)}

Hi ${authorFirstName},

I recently read your article "${article.title}" on ${article.publicationName} and found it really insightful [SPECIFIC COMPLIMENT ABOUT THEIR WORK].

${angle}

I'm reaching out because we recently launched Aligna (https://www.align-a.com), a conversational AI recruiter that conducts live phone interviews instead of async video screening. Some key differentiations:

• Real-time AI phone conversations (not pre-recorded video responses)
• Built on LiveKit + Azure OpenAI for voice-first candidate experience
• Eliminates scheduling complexity - candidates just call a number
• Dual-sided platform: candidates AND employers interact via AI voice

${generateSpecificValue(article)}

${generateAsk(article, author)}

I completely understand if this doesn't fit your editorial direction. Either way, thanks for writing great content about recruiting innovation.

Best,
[Your Name]
Aligna Team

---
📞 Live demo: https://www.align-a.com
🔧 Built by MIT founder with open-source monorepo
`.trim();
}

function generateSubject(article: Article): string {
  if (article.contentType === "listicle") {
    return "Addition to your recruiting tools article";
  } else if (article.contentType === "comparison") {
    return "New alternative for your recruiting platform comparison";
  } else if (article.contentType === "guide") {
    return "Voice AI perspective for your recruiting guide";
  } else {
    return "Thought on your article about recruiting automation";
  }
}

function generateSpecificValue(article: Article): string {
  const text = article.fullText.toLowerCase();
  
  if (text.includes("hirevue") || text.includes("async video")) {
    return "For your readers evaluating async video tools, Aligna offers a phone-first alternative that many candidates find less intimidating than recording video responses.";
  }
  
  if (text.includes("scheduling") || text.includes("calendly")) {
    return "Since your article highlights scheduling challenges, Aligna's approach of 'call anytime' might resonate with your audience.";
  }
  
  if (text.includes("developer") || text.includes("technical")) {
    return "For technical recruiting (which your article focuses on), our open-source approach and MIT founder background might add credibility.";
  }
  
  return "Given your focus on recruiting innovation, this might be a useful addition for your readers.";
}

function generateAsk(article: Article, author: AuthorContact): string {
  if (article.contentType === "listicle") {
    return "Would you consider adding Aligna to your list, or would a separate mention make sense?";
  } else if (article.contentType === "comparison") {
    return "Would it make sense to add Aligna as an alternative in your comparison, especially in the 'live voice AI' category?";
  } else if (article.lastUpdated) {
    return "If you update this article in the future, would mentioning voice-first AI screening fit your narrative?";
  } else {
    return "Would a reference to Aligna as an example of conversational AI in recruiting be useful for your readers?";
  }
}
```

### Outreach Best Practices (Display to User)

**Include these guidelines in the output:**

```markdown
## 🚨 CRITICAL OUTREACH RULES

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
- **If they ask for more info**: Provide demo link, technical details, founder credentials
```

---

## 5️⃣ Output Format & Data Structure

### Primary Output: JSON

```typescript
interface ProspectingResult {
  metadata: {
    searchDate: Date;
    totalArticlesFound: number;
    totalArticlesScored: number;
    averageScore: number;
    highPriorityCount: number; // Score 60+
  };
  
  prospects: Prospect[];
}

interface Prospect {
  // Article info
  article: {
    title: string;
    url: string;
    publication: string;
    publishDate: string | null;
    lastUpdated: string | null;
    excerpt: string;
    contentType: string;
    wordCount: number;
    detectedTopics: string[];
  };
  
  // Author info
  author: {
    name: string;
    email?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    contactMethod: string;
  };
  
  // Scoring
  score: number;
  scoreBreakdown: {
    topicalRelevance: number;
    articleQuality: number;
    updateability: number;
    authorCredibility: number;
    competitiveGap: number;
    reachability: number;
  };
  priority: "excellent" | "strong" | "moderate" | "weak";
  
  // Outreach
  outreach: {
    angle: string;
    reason: string;
    suggestedSubject: string;
    emailDraft: string;
    estimatedResponseRate: string;
  };
}
```

### Secondary Output: CSV (for spreadsheets)

```csv
Score,Priority,Article Title,URL,Author,Contact,Publication,Angle,Subject Line
92,excellent,"Top 10 Recruiting Tools for 2024",https://...,Jane Doe,jane@example.com,TechRecruiter Blog,"Missing voice AI category","Addition to your recruiting tools list"
```

### Tertiary Output: Lightweight Dashboard (Optional)

If building a web UI, display:
1. **Summary Stats**: Total prospects, avg score, priority distribution
2. **Prospect Table**: Sortable by score, publication, date
3. **Filters**: By priority, content type, publication, date range
4. **Export**: JSON, CSV, or copy email drafts
5. **Contact Tracker**: Mark as "contacted", "responded", "declined"

---

## 6️⃣ Technical Implementation Requirements

### Architecture: TypeScript-First

```typescript
// Suggested project structure
src/
├── search/
│   ├── engines/
│   │   ├── google.ts
│   │   ├── bing.ts
│   │   └── custom-crawl.ts
│   ├── parsers/
│   │   ├── article-extractor.ts
│   │   └── author-extractor.ts
│   └── index.ts
├── scoring/
│   ├── relevance-scorer.ts
│   ├── quality-scorer.ts
│   └── index.ts
├── outreach/
│   ├── angle-generator.ts
│   ├── email-template.ts
│   └── index.ts
├── storage/
│   ├── database.ts (SQLite or JSON files)
│   └── export.ts
├── cli.ts (command-line interface)
└── index.ts
```

### Key Dependencies

```json
{
  "dependencies": {
    "@mozilla/readability": "^0.4.4",  // Article content extraction
    "cheerio": "^1.0.0-rc.12",         // HTML parsing
    "axios": "^1.6.0",                 // HTTP requests
    "dotenv": "^16.3.1",               // Environment variables
    "commander": "^11.1.0",            // CLI framework
    "csv-writer": "^1.6.0",            // CSV export
    "openai": "^4.20.0"                // Optional: LLM for angle generation
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### Rate Limiting & Ethical Scraping

**Implement these safeguards:**

```typescript
class EthicalScraper {
  private requestQueue: Map<string, number> = new Map();
  private readonly MIN_DELAY_MS = 2000; // 2 seconds between requests
  
  async fetch(url: string): Promise<string> {
    const domain = new URL(url).hostname;
    
    // Check robots.txt
    const robotsAllowed = await this.checkRobotsTxt(domain, url);
    if (!robotsAllowed) {
      throw new Error(`Robots.txt disallows scraping ${url}`);
    }
    
    // Rate limiting per domain
    const lastRequest = this.requestQueue.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    if (timeSinceLastRequest < this.MIN_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_DELAY_MS - timeSinceLastRequest));
    }
    
    this.requestQueue.set(domain, Date.now());
    
    // Add polite user-agent
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "AlignaPRBot/1.0 (+https://www.align-a.com/pr-bot; contact@align-a.com)"
      }
    });
    
    return response.data;
  }
  
  async checkRobotsTxt(domain: string, url: string): Promise<boolean> {
    // Implement robots.txt parser
    // Return true if allowed, false if disallowed
  }
}
```

**Rate Limiting Rules:**
- Min 2 seconds between requests to same domain
- Max 100 requests per domain per hour
- Respect `Crawl-delay` in robots.txt
- Implement exponential backoff on 429 responses
- Cache article content to avoid re-fetching

**Legal Compliance:**
- Only scrape publicly accessible content
- Respect robots.txt directives
- Include contact info in User-Agent
- Don't scrape paywalled content
- Cache to minimize server load

### Environment Variables

```bash
# .env.example

# Search APIs (optional - use free tier or direct scraping)
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
BING_SEARCH_API_KEY=

# OpenAI (optional - for enhanced angle generation)
OPENAI_API_KEY=

# Storage
DATABASE_PATH=./data/prospects.db

# Scraping config
MAX_REQUESTS_PER_HOUR=100
MIN_DELAY_BETWEEN_REQUESTS=2000
USER_AGENT="AlignaPRBot/1.0 (+https://www.align-a.com; contact@align-a.com)"

# Output
OUTPUT_FORMAT=json # json, csv, or both
OUTPUT_PATH=./output/
```

### CLI Interface

```bash
# Basic usage
npm run prospect -- --query "conversational AI recruiting" --limit 50

# Advanced usage
npm run prospect \
  --queries "voice AI interviews,candidate screening automation" \
  --sources "dev.to,medium,techcrunch" \
  --min-score 60 \
  --output json \
  --output-path ./results/

# Update existing prospects (re-score)
npm run prospect --update --input ./results/prospects.json

# Export to CSV for manual review
npm run export --input ./results/prospects.json --format csv
```

**CLI Options:**
```typescript
interface CLIOptions {
  query?: string;              // Single search query
  queries?: string;            // Comma-separated queries
  sources?: string;            // Comma-separated sources
  limit?: number;              // Max articles per query
  minScore?: number;           // Minimum score to include (default: 40)
  output?: "json" | "csv" | "both";
  outputPath?: string;
  update?: boolean;            // Re-score existing prospects
  input?: string;              // Input file for update mode
  verbose?: boolean;           // Detailed logging
}
```

---

## 7️⃣ Stretch Features (Nice to Have)

### A. Deduplication
- Detect same article across multiple sources (e.g., syndicated content)
- Merge duplicate author profiles
- Cluster similar articles (e.g., "Top 10 tools" listicles)

```typescript
function deduplicateArticles(articles: Article[]): Article[] {
  // Use URL normalization
  // Use fuzzy title matching (Levenshtein distance)
  // Detect syndicated content by author + publish date
}
```

### B. Competitor Mention Flagging

```typescript
interface CompetitorAnalysis {
  mentionsCompetitors: string[];
  competitorPositioning: string; // How competitor is described
  gapOpportunity: string;        // What Aligna adds vs. competitor
}

// Example: "Article mentions HireVue negatively ('expensive, impersonal') 
// - opportunity to position Aligna as more human/accessible"
```

### C. Update-Friendly Post Detection

Flag articles that signal openness to updates:
- "Last updated: [recent date]"
- "We'll update this list periodically"
- "Let us know if we missed anything"
- Active comment section
- Author requests feedback

### D. Founder Credibility Angle

For articles mentioning MIT, startups, or founder stories:
```typescript
if (article.fullText.includes("MIT") || article.detectedTopics.includes("startup")) {
  outreach.founderAngle = "Aligna is built by MIT alum Kiarash Adl, combining technical depth with real-world recruiting experience.";
}
```

### E. Multi-Language Support (Future)

- Detect article language
- Generate outreach in author's language
- Prioritize English first, expand to Spanish, French, German

### F. Email Verification (Optional)

If public email found, optionally verify deliverability:
- DNS MX record check
- SMTP connection test (don't send, just verify)
- Flag bounced addresses

### G. Automated Follow-Up Tracking

```typescript
interface ContactHistory {
  prospectId: string;
  outreachDate: Date;
  followUpDate?: Date;
  response?: "positive" | "negative" | "no-response";
  notes: string;
}

// Reminder system: "Follow up with Jane Doe after 5 days"
```

---

## 8️⃣ Success Metrics & Quality Assurance

### Define Success

Before running the tool, establish target metrics:

```typescript
interface SuccessMetrics {
  // Volume
  totalProspectsGenerated: number;     // Target: 50-100
  highPriorityCount: number;           // Target: 20-30 (score 60+)
  
  // Quality
  averageScore: number;                // Target: 55+
  averageWordCount: number;            // Target: 1200+
  
  // Outreach
  emailsSent: number;
  responses: number;
  acceptanceRate: number;              // Target: 10-20%
  backlinksAcquired: number;           // Target: 5-10 from first batch
  
  // Efficiency
  timePerProspect: number;             // Target: < 2 minutes manual review
  falsePositives: number;              // Prospects that don't make sense
}
```

### Quality Assurance Checklist

Before sending outreach:
- [ ] Manually review top 10 prospects - do they make sense?
- [ ] Verify email addresses are publicly listed (no guessing)
- [ ] Check outreach drafts for tone and personalization
- [ ] Ensure no spam-looking patterns (e.g., all from same domain)
- [ ] Confirm articles are recent or evergreen (not 5+ years old)
- [ ] Validate that Aligna isn't already mentioned

### Feedback Loop

Track results and iterate:
```typescript
interface OutreachResult {
  prospectId: string;
  contacted: boolean;
  responseReceived: boolean;
  outcome: "backlink-added" | "declined-politely" | "no-response" | "spam-report";
  feedback?: string;
}

// Use feedback to adjust scoring weights
// Example: If listicles convert better, increase listicle score
```

---

## 9️⃣ Final Output: Summary Report

When tool completes, generate a summary:

```markdown
# Aligna PR Prospecting Report
Generated: 2024-12-16

## Summary
- **Total Articles Analyzed**: 127
- **High-Priority Prospects (60+ score)**: 27
- **Average Score**: 58.3
- **Top Publication**: dev.to (8 prospects)

## Top 5 Prospects

### 1. "The Future of AI in Technical Recruiting" (Score: 94)
- **Author**: Jane Doe (jane@example.com)
- **Publication**: TechCrunch
- **Why**: Discusses async video screening pain points, no mention of voice AI
- **Angle**: Add Aligna as example of live conversational AI alternative
- **Next Steps**: Send personalized email (draft attached)

[... repeat for top 5 ...]

## Breakdown by Priority
- 🔥 Excellent (80-100): 8 prospects
- ✅ Strong (60-79): 19 prospects
- 🤔 Moderate (40-59): 34 prospects
- 🤷 Weak (20-39): 42 prospects
- ❌ Skip (0-19): 24 prospects

## Recommended Actions
1. **This Week**: Reach out to 8 excellent prospects
2. **Next Week**: Contact 19 strong prospects
3. **Month 2**: Review moderate prospects for manual curation
4. **Track**: Set up CRM to track responses

## Files Generated
- `prospects-excellent.json` - Top 8 prospects with full details
- `prospects-all.csv` - All prospects for spreadsheet review
- `email-drafts/` - 27 personalized email drafts ready to send
```

---

## 🎯 End Goal

At the end of running this tool, I should have:

1. **A curated list** of 20-30 high-quality articles whose authors are likely receptive
2. **Contact information** for each author (ethically sourced)
3. **Personalized outreach drafts** explaining why Aligna fits their content
4. **Clear prioritization** so I can focus on best opportunities first
5. **Tracking system** to follow up and measure success

**Optimize for signal over volume.** Better to have 25 excellent prospects than 200 mediocre ones.

---

## 🔒 Ethical & Legal Reminders

- ✅ **Respect robots.txt** - Don't scrape disallowed pages
- ✅ **Rate limit requests** - Be kind to servers
- ✅ **No email guessing** - Only use publicly listed contacts
- ✅ **Personal outreach only** - No bulk marketing tools
- ✅ **Transparent identity** - Identify as Aligna team member
- ✅ **Accept rejection gracefully** - "No" means move on
- ✅ **Value-first approach** - Focus on how Aligna helps their audience

---

## 📚 References & Context

### About Aligna
- **Website**: https://www.align-a.com
- **Founder**: Kiarash Adl (MIT alum) - kiarasha@alum.mit.edu
- **Technology**: LiveKit + Azure OpenAI + TypeScript/Node.js
- **Unique Value**: Live voice AI interviews over phone (not async video)
- **Target Market**: Tech recruiting, startups, remote-first companies

### Competitor Landscape
- **HireVue**: Market leader in async video interviews (our main alternative positioning)
- **Modern Hire**: Similar to HireVue
- **Karat**: Live technical interviews with human engineers (not AI)
- **Willo**: Async video platform
- **Spark Hire**: Video interviewing platform

### Key Talking Points
1. "Phone-first" eliminates video recording anxiety
2. "Live conversational AI" feels more human than one-way video
3. "Zero scheduling" - candidates call anytime
4. "Built by MIT founder" - technical credibility
5. "Open source" - developer-friendly approach

---

## 🚀 Implementation Checklist

- [ ] Set up TypeScript project structure
- [ ] Implement ethical scraper with robots.txt compliance
- [ ] Build article search across multiple sources
- [ ] Create article content extractor (Readability + Cheerio)
- [ ] Build author contact extraction logic
- [ ] Implement 6-factor scoring algorithm
- [ ] Create outreach angle generator
- [ ] Build email draft template system
- [ ] Add JSON and CSV export
- [ ] Create CLI interface with Commander
- [ ] Add rate limiting and caching
- [ ] Write comprehensive tests
- [ ] Document usage and API
- [ ] Create example .env file
- [ ] Build optional lightweight dashboard
- [ ] Set up contact tracking system

---

**Remember**: This tool is for building genuine relationships with content creators, not gaming SEO or spamming. Quality, thoughtfulness, and respect are paramount.
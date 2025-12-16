# Aligna PR Prospecting Tool

An intelligent, ethical PR prospecting tool that identifies high-quality backlink opportunities for **Aligna** (https://www.align-a.com) — a conversational AI recruiter platform that conducts live voice interviews over the phone.

## 🎯 Purpose

This tool is designed for **thoughtful, manual outreach**, not bulk spam. Quality over quantity.

### What It Does

1. **Searches** for relevant articles about recruiting, HR tech, and AI tools
2. **Extracts** article content and author contact information
3. **Scores** prospects using a 6-factor algorithm (0-100 points)
4. **Generates** personalized outreach email drafts
5. **Exports** results to JSON, CSV, and individual email drafts

## 🚀 Quick Start

### Installation

```bash
# Clone and install dependencies
cd aligna-pr
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your API keys (optional but recommended)

# Build the project
npm run build
```

### Basic Usage

```bash
# Run comprehensive search
npm run prospect -- search --limit 50 --verbose

# Search with specific query
npm run prospect -- search --query "conversational AI recruiting"

# Search specific category
npm run prospect -- search --category candidateScreening --limit 30

# Export existing prospects
npm run prospect -- export --min-score 60

# View statistics
npm run prospect -- stats

# See outreach guidelines
npm run prospect -- guidelines
```

## 📋 CLI Commands

### `search` - Find new prospects

```bash
aligna-prospect search [options]

Options:
  -q, --query <query>      Single search query
  -Q, --queries <queries>  Comma-separated search queries
  -c, --category <cat>     Search category (conversationalAI, candidateScreening, hrTech, remoteWork, emergingTech)
  -e, --engines <engines>  Search engines (google, bing, duckduckgo, devto, hackernews)
  -s, --sources <sources>  Specific source domains to search
  -l, --limit <number>     Maximum articles to process (default: 50)
  -m, --min-score <number> Minimum score to include (default: 40)
  -o, --output <path>      Output directory path
  -v, --verbose            Verbose output
```

### `export` - Export prospects

```bash
aligna-prospect export [options]

Options:
  -o, --output <path>      Output directory path
  -m, --min-score <number> Minimum score to export (default: 0)
  -p, --priority <pri>     Filter by priority (excellent, strong, moderate)
  -f, --format <format>    Export format (json, csv, both)
```

### `stats` - View statistics

```bash
aligna-prospect stats
```

### `queries` - List search categories

```bash
aligna-prospect queries
```

### `track` - Track outreach

```bash
aligna-prospect track <prospectId> [options]

Options:
  -c, --contacted          Mark as contacted
  -r, --response <type>    Record response (positive, negative, no-response)
  -o, --outcome <type>     Record outcome (backlink-added, declined-politely, no-response, spam-report)
  -n, --notes <notes>      Add notes
```

## 📊 Scoring Algorithm

Each prospect is scored from 0-100 based on six factors:

| Factor | Points | Description |
|--------|--------|-------------|
| Topical Relevance | 0-30 | How closely the article matches voice AI/recruiting topics |
| Article Quality | 0-20 | Word count, content type, product mentions |
| Updateability | 0-20 | Likelihood the article will be updated |
| Author Credibility | 0-15 | Freelance status, expertise, publication quality |
| Competitive Gap | 0-10 | Mentions competitors but not Aligna |
| Reachability | 0-5 | Available contact methods |

### Priority Levels

- 🔥 **Excellent (80-100)**: Reach out ASAP
- ✅ **Strong (60-79)**: High priority
- 🤔 **Moderate (40-59)**: Consider if bandwidth allows
- 🤷 **Weak (20-39)**: Low priority
- ❌ **Skip (0-19)**: Not worth the effort

## 📁 Output Files

After running, the tool generates:

```
output/
├── prospects.json       # Full prospect data
├── prospects.csv        # Spreadsheet-friendly format
├── report.md           # Summary report
└── email-drafts/       # Individual email drafts for high-priority prospects
    ├── 92-top-10-ai-recruiting-tools.txt
    ├── 85-hirevue-alternatives.txt
    └── ...
```

## ⚙️ Configuration

Create a `.env` file based on `.env.example`:

```bash
# Search APIs (optional but recommended)
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
BING_SEARCH_API_KEY=your_key

# OpenAI (optional - for enhanced angle generation)
OPENAI_API_KEY=your_key

# Scraping config
MAX_REQUESTS_PER_HOUR=100
MIN_DELAY_BETWEEN_REQUESTS=2000

# Output
OUTPUT_FORMAT=both
OUTPUT_PATH=./output/
```

## 🔒 Ethical Guidelines

This tool follows strict ethical guidelines:

✅ **Respects robots.txt** - Skips disallowed pages
✅ **Rate limits requests** - 2+ seconds between requests to same domain
✅ **No email guessing** - Only uses publicly listed contacts
✅ **Personal outreach only** - Designed for one-by-one contact
✅ **Transparent identity** - Identifies as Aligna in User-Agent

## 🏗️ Project Structure

```
src/
├── search/
│   ├── engines/
│   │   ├── google.ts        # Google Custom Search API
│   │   ├── bing.ts          # Bing Search API
│   │   └── custom-crawl.ts  # DuckDuckGo, dev.to, HN
│   ├── parsers/
│   │   ├── article-extractor.ts
│   │   └── author-extractor.ts
│   ├── scraper.ts           # Ethical scraper with rate limiting
│   └── index.ts
├── scoring/
│   ├── relevance-scorer.ts
│   ├── quality-scorer.ts
│   ├── updateability-scorer.ts
│   └── index.ts
├── outreach/
│   ├── angle-generator.ts
│   ├── email-template.ts
│   └── index.ts
├── storage/
│   ├── database.ts          # SQLite storage
│   └── export.ts            # JSON/CSV export
├── config/
│   └── index.ts             # Configuration & constants
├── types/
│   └── index.ts             # TypeScript interfaces
├── cli.ts                   # CLI interface
└── index.ts                 # Main entry point
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Example Output

### Summary Report

```markdown
# Aligna PR Prospecting Report
Generated: 2024-12-16

## Summary
- **Total Articles Analyzed**: 127
- **High-Priority Prospects (60+ score)**: 27
- **Average Score**: 58.3

## Breakdown by Priority
- 🔥 Excellent (80-100): 8 prospects
- ✅ Strong (60-79): 19 prospects
- 🤔 Moderate (40-59): 34 prospects
- 🤷 Weak (20-39): 42 prospects
- ❌ Skip (0-19): 24 prospects

## Top 5 Prospects
1. "The Future of AI in Technical Recruiting" (Score: 94)
   - Author: Jane Doe (jane@example.com)
   - Publication: TechCrunch
   - Why: Discusses async video screening pain points
```

### Email Draft

```
Subject: Addition to your recruiting tools article

Hi Jane,

I recently read your article "Top 10 AI Recruiting Tools" on TechCrunch 
and found it really insightful [SPECIFIC COMPLIMENT].

This article discusses async video screening but doesn't mention live 
conversational AI alternatives like Aligna, which eliminates the video 
recording anxiety many candidates experience.

I'm reaching out because we recently launched Aligna (https://www.align-a.com), 
a conversational AI recruiter that conducts live phone interviews instead 
of async video screening...
```

## 📚 About Aligna

- **Website**: https://www.align-a.com
- **Founder**: Kiarash Adl (MIT alum)
- **Technology**: LiveKit + Azure OpenAI + TypeScript/Node.js
- **Unique Value**: Live voice AI interviews over phone (not async video)

## 📄 License

MIT

---

**Remember**: This tool is for building genuine relationships with content creators, not gaming SEO or spamming. Quality, thoughtfulness, and respect are paramount.
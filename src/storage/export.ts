/**
 * Export utilities for JSON and CSV output
 */

import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { Prospect, ProspectingResult } from '../types';
import { config, ALIGNA } from '../config';
import { getPriorityEmoji, getScoreExplanation } from '../scoring';
import { getCompetitorSentimentSummary } from '../outreach/competitor-sentiment';

/**
 * Ensure output directory exists
 */
function ensureOutputDir(outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Export prospects to JSON file
 */
export async function exportToJson(
  result: ProspectingResult,
  outputPath?: string
): Promise<string> {
  const filePath = outputPath || path.join(config.outputPath, 'prospects.json');
  ensureOutputDir(filePath);

  const output = {
    metadata: {
      ...result.metadata,
      searchDate: result.metadata.searchDate.toISOString(),
    },
    prospects: result.prospects.map((p) => ({
      ...p,
      article: {
        ...p.article,
        publishDate: p.article.publishDate?.toISOString() || null,
        lastUpdated: p.article.lastUpdated?.toISOString() || null,
        // Omit full text from export for readability
        fullText: p.article.fullText.slice(0, 500) + '...',
      },
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return filePath;
}

/**
 * Export prospects to CSV file
 */
export async function exportToCsv(
  prospects: Prospect[],
  outputPath?: string
): Promise<string> {
  const filePath = outputPath || path.join(config.outputPath, 'prospects.csv');
  ensureOutputDir(filePath);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'score', title: 'Score' },
      { id: 'priority', title: 'Priority' },
      { id: 'title', title: 'Article Title' },
      { id: 'url', title: 'URL' },
      { id: 'author', title: 'Author' },
      { id: 'contact', title: 'Contact' },
      { id: 'contactMethod', title: 'Contact Method' },
      { id: 'publication', title: 'Publication' },
      { id: 'contentType', title: 'Content Type' },
      { id: 'wordCount', title: 'Word Count' },
      { id: 'publishDate', title: 'Publish Date' },
      { id: 'angle', title: 'Angle' },
      { id: 'subject', title: 'Subject Line' },
      { id: 'responseRate', title: 'Est. Response' },
      { id: 'competitors', title: 'Competitors Mentioned' },
    ],
  });

  const records = prospects.map((p) => ({
    score: p.score,
    priority: `${getPriorityEmoji(p.priority)} ${p.priority}`,
    title: p.article.title,
    url: p.article.url,
    author: p.author.name,
    contact:
      p.author.publicEmail ||
      p.author.linkedInUrl ||
      p.author.twitterHandle ||
      'Unknown',
    contactMethod: p.author.bestContactMethod,
    publication: p.article.publicationName,
    contentType: p.article.contentType,
    wordCount: p.article.wordCount,
    publishDate: p.article.publishDate?.toISOString().split('T')[0] || 'Unknown',
    angle: p.outreach.angle.slice(0, 200),
    subject: p.outreach.suggestedSubject,
    responseRate: p.outreach.estimatedResponseRate,
    competitors: p.article.mentionsCompetitors.join(', ') || 'None',
  }));

  await csvWriter.writeRecords(records);
  return filePath;
}

/**
 * Export email drafts to individual files
 */
export async function exportEmailDrafts(
  prospects: Prospect[],
  outputDir?: string
): Promise<string> {
  const dir = outputDir || path.join(config.outputPath, 'email-drafts');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Filter to high-priority only
  const highPriority = prospects.filter(
    (p) => p.priority === 'excellent' || p.priority === 'strong'
  );

  for (const prospect of highPriority) {
    const filename = `${prospect.score}-${sanitizeFilename(prospect.article.title)}.txt`;
    const filePath = path.join(dir, filename);

    const content = `# Outreach for: ${prospect.article.title}
# Score: ${prospect.score} (${prospect.priority})
# Author: ${prospect.author.name}
# Contact: ${prospect.author.publicEmail || prospect.author.bestContactMethod}
# URL: ${prospect.article.url}

---

${prospect.outreach.suggestedEmailDraft}

---

## Score Breakdown:
${getScoreExplanation(prospect.scoreBreakdown)}

## Notes:
${prospect.outreach.angle}
`;

    fs.writeFileSync(filePath, content);
  }

  return dir;
}

/**
 * Generate enhanced summary report matching PROMPT spec
 */
export function generateSummaryReport(result: ProspectingResult): string {
  const { metadata, prospects } = result;

  // Group by priority
  const byPriority = {
    excellent: prospects.filter((p) => p.priority === 'excellent'),
    strong: prospects.filter((p) => p.priority === 'strong'),
    moderate: prospects.filter((p) => p.priority === 'moderate'),
    weak: prospects.filter((p) => p.priority === 'weak'),
    skip: prospects.filter((p) => p.priority === 'skip'),
  };

  // Top publications
  const pubCounts = new Map<string, number>();
  for (const p of prospects) {
    const pub = p.article.publicationName;
    pubCounts.set(pub, (pubCounts.get(pub) || 0) + 1);
  }
  const topPubs = Array.from(pubCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Top domains
  const domainCounts = new Map<string, number>();
  for (const p of prospects) {
    const domain = p.article.domain;
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  }
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Content type distribution
  const contentTypes = new Map<string, number>();
  for (const p of prospects) {
    const type = p.article.contentType;
    contentTypes.set(type, (contentTypes.get(type) || 0) + 1);
  }

  // Response rate distribution
  const responseRates = {
    high: prospects.filter(p => p.outreach.estimatedResponseRate === 'high').length,
    medium: prospects.filter(p => p.outreach.estimatedResponseRate === 'medium').length,
    low: prospects.filter(p => p.outreach.estimatedResponseRate === 'low').length,
  };

  // Competitor mentions analysis
  const competitorMentions = new Map<string, number>();
  for (const p of prospects) {
    for (const comp of p.article.mentionsCompetitors) {
      competitorMentions.set(comp, (competitorMentions.get(comp) || 0) + 1);
    }
  }
  const topCompetitors = Array.from(competitorMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top 5 prospects with full details
  const top5 = prospects.slice(0, 5);

  let report = `# 📊 Aligna PR Prospecting Report
Generated: ${metadata.searchDate.toISOString().split('T')[0]} at ${metadata.searchDate.toISOString().split('T')[1].slice(0, 5)} UTC

---

## 📈 Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Articles Analyzed** | ${metadata.totalArticlesFound} |
| **Articles Scored** | ${metadata.totalArticlesScored} |
| **High-Priority Prospects (60+)** | ${metadata.highPriorityCount} |
| **Average Score** | ${metadata.averageScore.toFixed(1)} |
| **Processing Time** | ${(metadata.processingTimeMs / 1000).toFixed(1)}s |
| **Search Queries** | ${metadata.queries.length} |

---

## 🎯 Breakdown by Priority

| Priority | Count | Percentage |
|----------|-------|------------|
| 🔥 Excellent (80-100) | ${byPriority.excellent.length} | ${((byPriority.excellent.length / prospects.length) * 100).toFixed(1)}% |
| ✅ Strong (60-79) | ${byPriority.strong.length} | ${((byPriority.strong.length / prospects.length) * 100).toFixed(1)}% |
| 🤔 Moderate (40-59) | ${byPriority.moderate.length} | ${((byPriority.moderate.length / prospects.length) * 100).toFixed(1)}% |
| 🤷 Weak (20-39) | ${byPriority.weak.length} | ${((byPriority.weak.length / prospects.length) * 100).toFixed(1)}% |
| ❌ Skip (0-19) | ${byPriority.skip.length} | ${((byPriority.skip.length / prospects.length) * 100).toFixed(1)}% |

---

## 🔥 Top 5 Prospects (Detailed)

`;

  for (let i = 0; i < top5.length; i++) {
    const p = top5[i];
    const sentimentSummary = getCompetitorSentimentSummary(p.article);
    
    report += `### ${i + 1}. "${p.article.title}" (Score: ${p.score}/100)

**📍 Source Information**
- **Publication**: ${p.article.publicationName}
- **URL**: ${p.article.url}
- **Content Type**: ${p.article.contentType}
- **Word Count**: ${p.article.wordCount.toLocaleString()} words
- **Published**: ${p.article.publishDate?.toISOString().split('T')[0] || 'Unknown'}
${p.article.lastUpdated ? `- **Last Updated**: ${p.article.lastUpdated.toISOString().split('T')[0]}` : ''}

**👤 Author Details**
- **Name**: ${p.author.name}
- **Contact**: ${p.author.publicEmail || p.author.linkedInUrl || p.author.twitterHandle || 'Not found'}
- **Contact Method**: ${p.author.bestContactMethod}
- **Type**: ${p.author.isFreelance ? 'Freelance Writer' : p.author.isEditor ? 'Editor' : 'Staff Writer'}
${p.author.worksForPublication ? `- **Works For**: ${p.author.worksForPublication}` : ''}

**📊 Score Breakdown**
| Factor | Score | Max |
|--------|-------|-----|
| Topical Relevance | ${p.scoreBreakdown.topicalRelevance} | 30 |
| Article Quality | ${p.scoreBreakdown.articleQuality} | 20 |
| Updateability | ${p.scoreBreakdown.updateability} | 20 |
| Author Credibility | ${p.scoreBreakdown.authorCredibility} | 15 |
| Competitive Gap | ${p.scoreBreakdown.competitiveGap} | 10 |
| Reachability | ${p.scoreBreakdown.reachability} | 5 |

**🎯 Outreach Strategy**
- **Why Target**: ${p.outreach.opportunityReason}
- **Angle**: ${p.outreach.angle}
- **Subject Line**: ${p.outreach.suggestedSubject}
- **Est. Response Rate**: ${p.outreach.estimatedResponseRate}
${p.article.mentionsCompetitors.length > 0 ? `- **Competitors Mentioned**: ${p.article.mentionsCompetitors.join(', ')}` : ''}
${sentimentSummary !== 'No competitor mentions detected.' ? `- **Competitor Sentiment**:\n${sentimentSummary.split('\n').map(l => '  ' + l).join('\n')}` : ''}

---

`;
  }

  report += `## 📰 Top Publications

| Publication | Articles | Avg Score |
|-------------|----------|-----------|
`;

  for (const [pub, count] of topPubs) {
    const pubProspects = prospects.filter(p => p.article.publicationName === pub);
    const avgScore = pubProspects.reduce((s, p) => s + p.score, 0) / pubProspects.length;
    report += `| ${pub} | ${count} | ${avgScore.toFixed(1)} |\n`;
  }

  report += `
## 🌐 Top Domains

| Domain | Articles | High-Priority |
|--------|----------|---------------|
`;

  for (const [domain, count] of topDomains) {
    const domainProspects = prospects.filter(p => p.article.domain === domain);
    const highPriority = domainProspects.filter(p => p.score >= 60).length;
    report += `| ${domain} | ${count} | ${highPriority} |\n`;
  }

  report += `
## 📝 Content Type Distribution

| Type | Count | Percentage |
|------|-------|------------|
`;

  for (const [type, count] of Array.from(contentTypes.entries()).sort((a, b) => b[1] - a[1])) {
    report += `| ${type} | ${count} | ${((count / prospects.length) * 100).toFixed(1)}% |\n`;
  }

  if (topCompetitors.length > 0) {
    report += `
## 🏢 Competitor Mentions

| Competitor | Mentions | Opportunity |
|------------|----------|-------------|
`;

    for (const [comp, count] of topCompetitors) {
      const opportunity = count >= 3 ? '🔥 High' : count >= 2 ? '✅ Good' : '🤔 Moderate';
      report += `| ${comp} | ${count} | ${opportunity} |\n`;
    }
  }

  report += `
## 📧 Estimated Response Rate Distribution

| Response Rate | Count | Percentage |
|---------------|-------|------------|
| 🟢 High | ${responseRates.high} | ${((responseRates.high / prospects.length) * 100).toFixed(1)}% |
| 🟡 Medium | ${responseRates.medium} | ${((responseRates.medium / prospects.length) * 100).toFixed(1)}% |
| 🔴 Low | ${responseRates.low} | ${((responseRates.low / prospects.length) * 100).toFixed(1)}% |

---

## ✅ Recommended Action Items

### This Week (Priority: 🔥 Excellent)
${byPriority.excellent.length > 0 ? byPriority.excellent.slice(0, 5).map((p, i) => 
  `${i + 1}. **${p.article.title.slice(0, 50)}...** - Contact ${p.author.name} via ${p.author.bestContactMethod}`
).join('\n') : '_No excellent prospects found_'}

### Next Week (Priority: ✅ Strong)
${byPriority.strong.length > 0 ? byPriority.strong.slice(0, 5).map((p, i) =>
  `${i + 1}. **${p.article.title.slice(0, 50)}...** - Contact ${p.author.name} via ${p.author.bestContactMethod}`
).join('\n') : '_No strong prospects found_'}

### Month 2 (Review manually: 🤔 Moderate)
- ${byPriority.moderate.length} prospects to review
- Focus on those with high response rate estimates
- Prioritize listicles and comparison articles

---

## 📁 Files Generated

| File | Description |
|------|-------------|
| \`prospects.json\` | Complete prospect data with full article text |
| \`prospects.csv\` | Spreadsheet-friendly format for filtering |
| \`email-drafts/\` | ${byPriority.excellent.length + byPriority.strong.length} personalized email drafts |
| \`report.md\` | This summary report |
| \`dashboard.html\` | Interactive web dashboard |

---

## 🔗 Quick Links

- **Aligna Website**: ${ALIGNA.url}
- **Founder Contact**: ${ALIGNA.founder.email}
- **Outreach Guidelines**: Run \`aligna-prospect guidelines\`

---

*Report generated by Aligna PR Prospecting Tool v1.0.0*
`;

  return report;
}

/**
 * Export everything
 */
/**
 * Generate interactive HTML dashboard
 */
export function generateDashboard(result: ProspectingResult): string {
  const { metadata, prospects } = result;

  // Prepare data for JavaScript
  const prospectsJson = JSON.stringify(prospects.map(p => ({
    id: p.id,
    score: p.score,
    priority: p.priority,
    title: p.article.title,
    url: p.article.url,
    publication: p.article.publicationName,
    domain: p.article.domain,
    contentType: p.article.contentType,
    wordCount: p.article.wordCount,
    publishDate: p.article.publishDate?.toISOString().split('T')[0] || 'Unknown',
    lastUpdated: p.article.lastUpdated?.toISOString().split('T')[0] || null,
    authorName: p.author.name,
    authorEmail: p.author.publicEmail || '',
    authorLinkedIn: p.author.linkedInUrl || '',
    authorTwitter: p.author.twitterHandle || '',
    contactMethod: p.author.bestContactMethod,
    isFreelance: p.author.isFreelance,
    isEditor: p.author.isEditor,
    angle: p.outreach.angle,
    subject: p.outreach.suggestedSubject,
    emailDraft: p.outreach.suggestedEmailDraft,
    responseRate: p.outreach.estimatedResponseRate,
    competitors: p.article.mentionsCompetitors,
    topics: p.article.detectedTopics,
    scoreBreakdown: p.scoreBreakdown,
  })));

  const metadataJson = JSON.stringify({
    searchDate: metadata.searchDate.toISOString(),
    queries: metadata.queries,
    totalArticlesFound: metadata.totalArticlesFound,
    totalArticlesScored: metadata.totalArticlesScored,
    averageScore: metadata.averageScore,
    highPriorityCount: metadata.highPriorityCount,
    processingTimeMs: metadata.processingTimeMs,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aligna PR Prospecting Dashboard</title>
  <style>
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-500: #6b7280;
      --gray-700: #374151;
      --gray-900: #111827;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--gray-50);
      color: var(--gray-900);
      line-height: 1.5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      background: white;
      border-bottom: 1px solid var(--gray-200);
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    header h1 {
      font-size: 1.5rem;
      color: var(--primary);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-card h3 {
      font-size: 0.875rem;
      color: var(--gray-500);
      margin-bottom: 0.5rem;
    }

    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--gray-900);
    }

    .stat-card .value.excellent { color: var(--danger); }
    .stat-card .value.strong { color: var(--success); }

    .filters {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .filters label {
      font-size: 0.875rem;
      color: var(--gray-700);
    }

    .filters select, .filters input {
      padding: 0.5rem;
      border: 1px solid var(--gray-300);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .filters input[type="text"] {
      width: 250px;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-secondary {
      background: var(--gray-200);
      color: var(--gray-700);
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: var(--gray-100);
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--gray-500);
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid var(--gray-200);
    }

    th:hover {
      background: var(--gray-200);
    }

    th.sorted-asc::after { content: ' ↑'; }
    th.sorted-desc::after { content: ' ↓'; }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--gray-100);
      font-size: 0.875rem;
    }

    tr:hover {
      background: var(--gray-50);
    }

    .priority-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-excellent { background: #fef2f2; color: #dc2626; }
    .priority-strong { background: #ecfdf5; color: #059669; }
    .priority-moderate { background: #fffbeb; color: #d97706; }
    .priority-weak { background: #f3f4f6; color: #6b7280; }
    .priority-skip { background: #f3f4f6; color: #9ca3af; }

    .response-high { color: var(--success); }
    .response-medium { color: var(--warning); }
    .response-low { color: var(--danger); }

    .title-cell {
      max-width: 300px;
    }

    .title-cell a {
      color: var(--gray-900);
      text-decoration: none;
    }

    .title-cell a:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .title-cell .publication {
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .contact-cell a {
      color: var(--primary);
      text-decoration: none;
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--gray-500);
    }

    .modal-close:hover {
      color: var(--gray-900);
    }

    .email-draft {
      background: var(--gray-50);
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
      margin-top: 1rem;
    }

    .score-breakdown {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .score-item {
      background: var(--gray-100);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .score-item .label {
      color: var(--gray-500);
    }

    .score-item .value {
      font-weight: 600;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border-top: 1px solid var(--gray-200);
    }

    .export-section {
      display: flex;
      gap: 0.5rem;
    }

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
        align-items: stretch;
      }
      .filters input[type="text"] {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>🎯 Aligna PR Prospecting Dashboard</h1>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Prospects</h3>
        <div class="value" id="stat-total">-</div>
      </div>
      <div class="stat-card">
        <h3>Excellent (80+)</h3>
        <div class="value excellent" id="stat-excellent">-</div>
      </div>
      <div class="stat-card">
        <h3>Strong (60-79)</h3>
        <div class="value strong" id="stat-strong">-</div>
      </div>
      <div class="stat-card">
        <h3>Average Score</h3>
        <div class="value" id="stat-avg">-</div>
      </div>
      <div class="stat-card">
        <h3>High Response</h3>
        <div class="value" id="stat-response">-</div>
      </div>
    </div>

    <div class="filters">
      <div>
        <label>Search: </label>
        <input type="text" id="search" placeholder="Search title, author, publication...">
      </div>
      <div>
        <label>Priority: </label>
        <select id="filter-priority">
          <option value="">All</option>
          <option value="excellent">🔥 Excellent</option>
          <option value="strong">✅ Strong</option>
          <option value="moderate">🤔 Moderate</option>
          <option value="weak">🤷 Weak</option>
        </select>
      </div>
      <div>
        <label>Content Type: </label>
        <select id="filter-content">
          <option value="">All</option>
          <option value="listicle">Listicle</option>
          <option value="comparison">Comparison</option>
          <option value="guide">Guide</option>
          <option value="news">News</option>
          <option value="opinion">Opinion</option>
        </select>
      </div>
      <div>
        <label>Response Rate: </label>
        <select id="filter-response">
          <option value="">All</option>
          <option value="high">🟢 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🔴 Low</option>
        </select>
      </div>
      <div class="export-section">
        <button class="btn btn-secondary" onclick="exportCSV()">Export CSV</button>
        <button class="btn btn-secondary" onclick="exportJSON()">Export JSON</button>
      </div>
    </div>

    <div class="table-container">
      <table id="prospects-table">
        <thead>
          <tr>
            <th data-sort="score">Score</th>
            <th data-sort="priority">Priority</th>
            <th data-sort="title">Article</th>
            <th data-sort="authorName">Author</th>
            <th data-sort="contentType">Type</th>
            <th data-sort="publishDate">Date</th>
            <th data-sort="responseRate">Response</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="table-body">
        </tbody>
      </table>
      <div class="pagination">
        <span id="showing-count">Showing 0 prospects</span>
        <div>
          <button class="btn btn-secondary" id="prev-page" onclick="prevPage()">Previous</button>
          <button class="btn btn-secondary" id="next-page" onclick="nextPage()">Next</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div class="modal" id="detail-modal">
    <div class="modal-content">
      <span class="modal-close" onclick="closeModal()">&times;</span>
      <div id="modal-body"></div>
    </div>
  </div>

  <script>
    // Data
    const prospects = ${prospectsJson};
    const metadata = ${metadataJson};
    
    // State
    let filteredProspects = [...prospects];
    let sortColumn = 'score';
    let sortDirection = 'desc';
    let currentPage = 0;
    const pageSize = 25;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      updateStats();
      renderTable();
      setupEventListeners();
    });

    function updateStats() {
      document.getElementById('stat-total').textContent = prospects.length;
      document.getElementById('stat-excellent').textContent = prospects.filter(p => p.priority === 'excellent').length;
      document.getElementById('stat-strong').textContent = prospects.filter(p => p.priority === 'strong').length;
      document.getElementById('stat-avg').textContent = metadata.averageScore.toFixed(1);
      document.getElementById('stat-response').textContent = prospects.filter(p => p.responseRate === 'high').length;
    }

    function setupEventListeners() {
      document.getElementById('search').addEventListener('input', debounce(applyFilters, 300));
      document.getElementById('filter-priority').addEventListener('change', applyFilters);
      document.getElementById('filter-content').addEventListener('change', applyFilters);
      document.getElementById('filter-response').addEventListener('change', applyFilters);
      
      document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortBy(th.dataset.sort));
      });
    }

    function applyFilters() {
      const search = document.getElementById('search').value.toLowerCase();
      const priority = document.getElementById('filter-priority').value;
      const content = document.getElementById('filter-content').value;
      const response = document.getElementById('filter-response').value;

      filteredProspects = prospects.filter(p => {
        if (search && !p.title.toLowerCase().includes(search) && 
            !p.authorName.toLowerCase().includes(search) &&
            !p.publication.toLowerCase().includes(search)) {
          return false;
        }
        if (priority && p.priority !== priority) return false;
        if (content && p.contentType !== content) return false;
        if (response && p.responseRate !== response) return false;
        return true;
      });

      currentPage = 0;
      sortProspects();
      renderTable();
    }

    function sortBy(column) {
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'desc';
      }
      
      document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
      });
      document.querySelector(\`th[data-sort="\${column}"]\`).classList.add(\`sorted-\${sortDirection}\`);
      
      sortProspects();
      renderTable();
    }

    function sortProspects() {
      filteredProspects.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    function renderTable() {
      const tbody = document.getElementById('table-body');
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const pageProspects = filteredProspects.slice(start, end);

      tbody.innerHTML = pageProspects.map(p => \`
        <tr>
          <td><strong>\${p.score}</strong></td>
          <td><span class="priority-badge priority-\${p.priority}">\${getPriorityEmoji(p.priority)} \${p.priority}</span></td>
          <td class="title-cell">
            <a href="\${p.url}" target="_blank">\${truncate(p.title, 60)}</a>
            <div class="publication">\${p.publication}</div>
          </td>
          <td class="contact-cell">
            \${p.authorName}<br>
            \${p.authorEmail ? \`<a href="mailto:\${p.authorEmail}">\${p.authorEmail}</a>\` : 
              p.authorLinkedIn ? \`<a href="\${p.authorLinkedIn}" target="_blank">LinkedIn</a>\` : 
              p.contactMethod}
          </td>
          <td>\${p.contentType}</td>
          <td>\${p.publishDate}</td>
          <td class="response-\${p.responseRate}">\${p.responseRate}</td>
          <td>
            <button class="btn btn-primary" onclick="showDetail('\${p.id}')">View</button>
          </td>
        </tr>
      \`).join('');

      document.getElementById('showing-count').textContent = 
        \`Showing \${start + 1}-\${Math.min(end, filteredProspects.length)} of \${filteredProspects.length} prospects\`;
      
      document.getElementById('prev-page').disabled = currentPage === 0;
      document.getElementById('next-page').disabled = end >= filteredProspects.length;
    }

    function prevPage() {
      if (currentPage > 0) {
        currentPage--;
        renderTable();
      }
    }

    function nextPage() {
      if ((currentPage + 1) * pageSize < filteredProspects.length) {
        currentPage++;
        renderTable();
      }
    }

    function showDetail(id) {
      const p = prospects.find(p => p.id === id);
      if (!p) return;

      document.getElementById('modal-body').innerHTML = \`
        <h2>\${p.title}</h2>
        <p><a href="\${p.url}" target="_blank">\${p.url}</a></p>
        
        <h3>Score: \${p.score}/100 (\${p.priority})</h3>
        <div class="score-breakdown">
          <div class="score-item"><span class="label">Relevance:</span> <span class="value">\${p.scoreBreakdown.topicalRelevance}/30</span></div>
          <div class="score-item"><span class="label">Quality:</span> <span class="value">\${p.scoreBreakdown.articleQuality}/20</span></div>
          <div class="score-item"><span class="label">Updateability:</span> <span class="value">\${p.scoreBreakdown.updateability}/20</span></div>
          <div class="score-item"><span class="label">Credibility:</span> <span class="value">\${p.scoreBreakdown.authorCredibility}/15</span></div>
          <div class="score-item"><span class="label">Gap:</span> <span class="value">\${p.scoreBreakdown.competitiveGap}/10</span></div>
          <div class="score-item"><span class="label">Reachability:</span> <span class="value">\${p.scoreBreakdown.reachability}/5</span></div>
        </div>

        <h3 style="margin-top: 1.5rem;">Author</h3>
        <p><strong>\${p.authorName}</strong> \${p.isFreelance ? '(Freelance)' : ''} \${p.isEditor ? '(Editor)' : ''}</p>
        <p>Contact: \${p.authorEmail || p.authorLinkedIn || p.contactMethod}</p>

        <h3 style="margin-top: 1.5rem;">Outreach Angle</h3>
        <p>\${p.angle}</p>

        <h3 style="margin-top: 1.5rem;">Email Draft</h3>
        <div class="email-draft">\${escapeHtml(p.emailDraft)}</div>

        <div style="margin-top: 1.5rem;">
          <button class="btn btn-primary" onclick="copyEmailDraft('\${p.id}')">Copy Email Draft</button>
          \${p.authorEmail ? \`<a class="btn btn-secondary" href="mailto:\${p.authorEmail}?subject=\${encodeURIComponent(p.subject)}" style="text-decoration: none; margin-left: 0.5rem;">Open in Email Client</a>\` : ''}
        </div>
      \`;

      document.getElementById('detail-modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('detail-modal').classList.remove('active');
    }

    function copyEmailDraft(id) {
      const p = prospects.find(p => p.id === id);
      navigator.clipboard.writeText(p.emailDraft);
      alert('Email draft copied to clipboard!');
    }

    function exportCSV() {
      const headers = ['Score', 'Priority', 'Title', 'URL', 'Author', 'Email', 'Publication', 'Type', 'Date', 'Response Rate'];
      const rows = filteredProspects.map(p => [
        p.score, p.priority, p.title, p.url, p.authorName, p.authorEmail, p.publication, p.contentType, p.publishDate, p.responseRate
      ]);
      
      const csv = [headers, ...rows].map(row => row.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(',')).join('\\n');
      downloadFile(csv, 'prospects-filtered.csv', 'text/csv');
    }

    function exportJSON() {
      downloadFile(JSON.stringify(filteredProspects, null, 2), 'prospects-filtered.json', 'application/json');
    }

    function downloadFile(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function getPriorityEmoji(priority) {
      const emojis = { excellent: '🔥', strong: '✅', moderate: '🤔', weak: '🤷', skip: '❌' };
      return emojis[priority] || '';
    }

    function truncate(str, len) {
      return str.length > len ? str.slice(0, len) + '...' : str;
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function debounce(fn, ms) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
      };
    }

    // Close modal on outside click
    document.getElementById('detail-modal').addEventListener('click', (e) => {
      if (e.target.id === 'detail-modal') closeModal();
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
}

/**
 * Export everything
 */
export async function exportAll(
  result: ProspectingResult,
  outputDir?: string
): Promise<{ json: string; csv: string; drafts: string; report: string; dashboard: string }> {
  const dir = outputDir || config.outputPath;

  const jsonPath = await exportToJson(result, path.join(dir, 'prospects.json'));
  const csvPath = await exportToCsv(result.prospects, path.join(dir, 'prospects.csv'));
  const draftsDir = await exportEmailDrafts(result.prospects, path.join(dir, 'email-drafts'));

  const report = generateSummaryReport(result);
  const reportPath = path.join(dir, 'report.md');
  fs.writeFileSync(reportPath, report);

  const dashboard = generateDashboard(result);
  const dashboardPath = path.join(dir, 'dashboard.html');
  fs.writeFileSync(dashboardPath, dashboard);

  return {
    json: jsonPath,
    csv: csvPath,
    drafts: draftsDir,
    report: reportPath,
    dashboard: dashboardPath,
  };
}

/**
 * Sanitize filename
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export { ensureOutputDir };
/**
 * Export utilities for JSON and CSV output
 */

import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { Prospect, ProspectingResult } from '../types';
import { config } from '../config';
import { getPriorityEmoji, getScoreExplanation } from '../scoring';

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
 * Generate summary report
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

  // Top 5 prospects detail
  const top5 = prospects.slice(0, 5);

  let report = `# Aligna PR Prospecting Report
Generated: ${metadata.searchDate.toISOString().split('T')[0]}

## Summary
- **Total Articles Analyzed**: ${metadata.totalArticlesFound}
- **Articles Scored**: ${metadata.totalArticlesScored}
- **High-Priority Prospects (60+ score)**: ${metadata.highPriorityCount}
- **Average Score**: ${metadata.averageScore.toFixed(1)}
- **Processing Time**: ${(metadata.processingTimeMs / 1000).toFixed(1)}s

## Breakdown by Priority
- 🔥 Excellent (80-100): ${byPriority.excellent.length} prospects
- ✅ Strong (60-79): ${byPriority.strong.length} prospects
- 🤔 Moderate (40-59): ${byPriority.moderate.length} prospects
- 🤷 Weak (20-39): ${byPriority.weak.length} prospects
- ❌ Skip (0-19): ${byPriority.skip.length} prospects

## Top Publications
${topPubs.map(([pub, count]) => `- ${pub}: ${count} articles`).join('\n')}

## Top 5 Prospects

`;

  for (let i = 0; i < top5.length; i++) {
    const p = top5[i];
    report += `### ${i + 1}. "${p.article.title}" (Score: ${p.score})
- **Author**: ${p.author.name} (${p.author.publicEmail || p.author.bestContactMethod})
- **Publication**: ${p.article.publicationName}
- **Type**: ${p.article.contentType}
- **Why**: ${p.outreach.angle.slice(0, 150)}...
- **Subject**: ${p.outreach.suggestedSubject}

`;
  }

  report += `## Recommended Actions
1. **This Week**: Reach out to ${byPriority.excellent.length} excellent prospects
2. **Next Week**: Contact ${byPriority.strong.length} strong prospects
3. **Month 2**: Review ${byPriority.moderate.length} moderate prospects for manual curation
4. **Track**: Set up CRM to track responses

## Files Generated
- \`prospects.json\` - All prospects with full details
- \`prospects.csv\` - Spreadsheet-friendly format
- \`email-drafts/\` - ${byPriority.excellent.length + byPriority.strong.length} personalized email drafts
`;

  return report;
}

/**
 * Export everything
 */
export async function exportAll(
  result: ProspectingResult,
  outputDir?: string
): Promise<{ json: string; csv: string; drafts: string; report: string }> {
  const dir = outputDir || config.outputPath;

  const jsonPath = await exportToJson(result, path.join(dir, 'prospects.json'));
  const csvPath = await exportToCsv(result.prospects, path.join(dir, 'prospects.csv'));
  const draftsDir = await exportEmailDrafts(result.prospects, path.join(dir, 'email-drafts'));

  const report = generateSummaryReport(result);
  const reportPath = path.join(dir, 'report.md');
  fs.writeFileSync(reportPath, report);

  return {
    json: jsonPath,
    csv: csvPath,
    drafts: draftsDir,
    report: reportPath,
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

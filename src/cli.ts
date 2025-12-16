#!/usr/bin/env node

/**
 * CLI for Aligna PR Prospecting Tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runProspecting } from './index';
import { exportAll, generateSummaryReport, getDatabase, closeDatabase } from './storage';
import { getOutreachBestPractices } from './outreach';
import { config, SEARCH_QUERIES } from './config';
import { SearchEngine } from './search';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('aligna-prospect')
  .description('Intelligent PR prospecting tool for Aligna')
  .version('1.0.0');

// Main prospect command
program
  .command('search')
  .description('Search for backlink opportunities')
  .option('-q, --query <query>', 'Single search query')
  .option('-Q, --queries <queries>', 'Comma-separated search queries')
  .option('-c, --category <category>', 'Search category (conversationalAI, candidateScreening, hrTech, remoteWork, emergingTech)')
  .option('-e, --engines <engines>', 'Comma-separated search engines (google, bing, duckduckgo, devto, hackernews)')
  .option('-s, --sources <sources>', 'Comma-separated source domains to search')
  .option('-l, --limit <number>', 'Maximum articles to process', '50')
  .option('-m, --min-score <number>', 'Minimum score to include', '40')
  .option('-o, --output <path>', 'Output directory path')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const spinner = ora('Starting prospecting...').start();

    try {
      // Parse options
      const queries = options.query
        ? [options.query]
        : options.queries
          ? options.queries.split(',').map((q: string) => q.trim())
          : options.category
            ? SEARCH_QUERIES[options.category as keyof typeof SEARCH_QUERIES]
            : undefined;

      const engines = options.engines
        ? (options.engines.split(',').map((e: string) => e.trim()) as SearchEngine[])
        : undefined;

      const sources = options.sources
        ? options.sources.split(',').map((s: string) => s.trim())
        : undefined;

      spinner.text = 'Searching for articles...';

      const result = await runProspecting({
        queries,
        engines,
        sources,
        limit: parseInt(options.limit, 10),
        minScore: parseInt(options.minScore, 10),
        verbose: options.verbose,
      });

      spinner.text = 'Exporting results...';

      const outputDir = options.output || config.outputPath;
      const files = await exportAll(result, outputDir);

      spinner.succeed(chalk.green('Prospecting complete!'));

      // Print summary
      console.log('\n' + chalk.bold('📊 Results Summary:'));
      console.log(`  Total articles found: ${result.metadata.totalArticlesFound}`);
      console.log(`  Articles scored: ${result.metadata.totalArticlesScored}`);
      console.log(`  High-priority (60+): ${chalk.green(result.metadata.highPriorityCount)}`);
      console.log(`  Average score: ${result.metadata.averageScore}`);

      console.log('\n' + chalk.bold('📁 Files generated:'));
      console.log(`  ${chalk.cyan(files.json)}`);
      console.log(`  ${chalk.cyan(files.csv)}`);
      console.log(`  ${chalk.cyan(files.drafts + '/')}`);
      console.log(`  ${chalk.cyan(files.report)}`);

      // Print top prospects
      if (result.prospects.length > 0) {
        console.log('\n' + chalk.bold('🔥 Top 5 Prospects:'));
        result.prospects.slice(0, 5).forEach((p, i) => {
          console.log(`  ${i + 1}. [${p.score}] ${p.article.title.slice(0, 60)}...`);
          console.log(`     ${chalk.dim(p.article.url)}`);
        });
      }

      console.log('\n' + chalk.dim('Run `aligna-prospect export` to generate fresh exports'));
      console.log(chalk.dim('Run `aligna-prospect guidelines` to see outreach best practices'));

    } catch (error) {
      spinner.fail(chalk.red('Prospecting failed'));
      console.error(error);
      process.exit(1);
    } finally {
      closeDatabase();
    }
  });

// Export command
program
  .command('export')
  .description('Export existing prospects from database')
  .option('-o, --output <path>', 'Output directory path')
  .option('-m, --min-score <number>', 'Minimum score to export', '0')
  .option('-p, --priority <priority>', 'Filter by priority (excellent, strong, moderate)')
  .option('-f, --format <format>', 'Export format (json, csv, both)', 'both')
  .action(async (options) => {
    const spinner = ora('Exporting prospects...').start();

    try {
      const db = await getDatabase();
      const prospects = db.getProspects({
        minScore: parseInt(options.minScore, 10),
        priority: options.priority,
      });

      if (prospects.length === 0) {
        spinner.warn('No prospects found matching criteria');
        return;
      }

      const result = {
        metadata: {
          searchDate: new Date(),
          queries: ['export'],
          totalArticlesFound: prospects.length,
          totalArticlesScored: prospects.length,
          averageScore: prospects.reduce((s, p) => s + p.score, 0) / prospects.length,
          highPriorityCount: prospects.filter((p) => p.score >= 60).length,
          processingTimeMs: 0,
        },
        prospects,
      };

      const outputDir = options.output || config.outputPath;
      const files = await exportAll(result, outputDir);

      spinner.succeed(chalk.green(`Exported ${prospects.length} prospects`));

      console.log('\n' + chalk.bold('📁 Files generated:'));
      console.log(`  ${chalk.cyan(files.json)}`);
      console.log(`  ${chalk.cyan(files.csv)}`);
      console.log(`  ${chalk.cyan(files.drafts + '/')}`);
      console.log(`  ${chalk.cyan(files.report)}`);

    } catch (error) {
      spinner.fail(chalk.red('Export failed'));
      console.error(error);
      process.exit(1);
    } finally {
      closeDatabase();
    }
  });

// Stats command
program
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    try {
      const db = await getDatabase();
      const stats = db.getStatistics();

      console.log('\n' + chalk.bold('📊 Prospect Database Statistics:'));
      console.log(`  Total prospects: ${stats.total}`);
      console.log(`  Average score: ${stats.averageScore}`);

      console.log('\n' + chalk.bold('By Priority:'));
      Object.entries(stats.byPriority).forEach(([priority, count]) => {
        const icon =
          priority === 'excellent' ? '🔥' :
          priority === 'strong' ? '✅' :
          priority === 'moderate' ? '🤔' :
          priority === 'weak' ? '🤷' : '❌';
        console.log(`  ${icon} ${priority}: ${count}`);
      });

      console.log('\n' + chalk.bold('Outreach:'));
      console.log(`  Contacted: ${stats.contacted}`);
      console.log(`  Responses: ${stats.responses}`);

    } finally {
      closeDatabase();
    }
  });

// Guidelines command
program
  .command('guidelines')
  .description('Show outreach best practices')
  .action(() => {
    console.log('\n' + getOutreachBestPractices() + '\n');
  });

// List queries command
program
  .command('queries')
  .description('List available search query categories')
  .action(() => {
    console.log('\n' + chalk.bold('📋 Available Search Query Categories:'));

    Object.entries(SEARCH_QUERIES).forEach(([category, queries]) => {
      console.log(`\n${chalk.cyan(category)}:`);
      queries.forEach((q) => {
        console.log(`  - "${q}"`);
      });
    });

    console.log('\n' + chalk.dim('Use with: aligna-prospect search --category <category>'));
  });

// Track command for contact history
program
  .command('track <prospectId>')
  .description('Track outreach for a prospect')
  .option('-c, --contacted', 'Mark as contacted')
  .option('-r, --response <type>', 'Record response (positive, negative, no-response)')
  .option('-o, --outcome <type>', 'Record outcome (backlink-added, declined-politely, no-response, spam-report)')
  .option('-n, --notes <notes>', 'Add notes')
  .action(async (prospectId, options) => {
    try {
      const db = await getDatabase();
      const prospect = db.getProspect(prospectId);

      if (!prospect) {
        console.error(chalk.red(`Prospect not found: ${prospectId}`));
        process.exit(1);
      }

      if (options.contacted || options.response || options.outcome) {
        db.addContactHistory({
          prospectId,
          outreachDate: new Date(),
          response: options.response,
          outcome: options.outcome,
          notes: options.notes || '',
        });

        console.log(chalk.green(`✅ Tracked contact for: ${prospect.article.title}`));
      }

      // Show history
      const history = db.getContactHistory(prospectId);
      if (history.length > 0) {
        console.log('\n' + chalk.bold('Contact History:'));
        history.forEach((h) => {
          console.log(`  ${h.outreachDate.toISOString().split('T')[0]}: ${h.response || 'contacted'} ${h.outcome ? `→ ${h.outcome}` : ''}`);
          if (h.notes) console.log(`    Notes: ${h.notes}`);
        });
      }

    } finally {
      closeDatabase();
    }
  });

// Parse and execute
program.parse();

// Default to search if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

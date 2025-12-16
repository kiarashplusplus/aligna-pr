/**
 * SQLite database for prospect storage and contact tracking
 * Uses sql.js - a pure JavaScript SQLite implementation
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { Prospect, ContactHistory } from '../types';
import { config } from '../config';

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function initSQL(): Promise<Awaited<ReturnType<typeof initSqlJs>>> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export class ProspectDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || config.databasePath;
  }

  /**
   * Initialize the database (must be called before use)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const SqlJs = await initSQL();

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing database or create new
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SqlJs.Database(fileBuffer);
    } else {
      this.db = new SqlJs.Database();
    }

    this.createTables();
    this.initialized = true;
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        publication TEXT,
        publish_date TEXT,
        last_updated TEXT,
        excerpt TEXT,
        full_text TEXT,
        word_count INTEGER,
        content_type TEXT,
        detected_topics TEXT,
        mentions_products INTEGER,
        mentions_competitors TEXT,
        domain TEXT,
        
        author_name TEXT,
        author_email TEXT,
        author_linkedin TEXT,
        author_twitter TEXT,
        author_website TEXT,
        author_contact_method TEXT,
        author_is_freelance INTEGER,
        author_is_editor INTEGER,
        author_bio TEXT,
        
        score INTEGER,
        score_breakdown TEXT,
        priority TEXT,
        
        outreach_angle TEXT,
        outreach_subject TEXT,
        outreach_email_draft TEXT,
        estimated_response_rate TEXT,
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS contact_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prospect_id TEXT NOT NULL,
        outreach_date TEXT NOT NULL,
        follow_up_date TEXT,
        response TEXT,
        outcome TEXT,
        notes TEXT,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id)
      )
    `);

    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_prospects_priority ON prospects(priority)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_prospects_domain ON prospects(domain)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_contact_history_prospect ON contact_history(prospect_id)');

    this.save();
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Save a prospect to the database
   */
  saveProspect(prospect: Prospect): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT OR REPLACE INTO prospects (
        id, url, title, publication, publish_date, last_updated,
        excerpt, full_text, word_count, content_type, detected_topics,
        mentions_products, mentions_competitors, domain,
        author_name, author_email, author_linkedin, author_twitter,
        author_website, author_contact_method, author_is_freelance,
        author_is_editor, author_bio,
        score, score_breakdown, priority,
        outreach_angle, outreach_subject, outreach_email_draft,
        estimated_response_rate, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        prospect.id,
        prospect.article.url,
        prospect.article.title,
        prospect.article.publicationName,
        prospect.article.publishDate?.toISOString() || null,
        prospect.article.lastUpdated?.toISOString() || null,
        prospect.article.excerpt,
        prospect.article.fullText,
        prospect.article.wordCount,
        prospect.article.contentType,
        JSON.stringify(prospect.article.detectedTopics),
        prospect.article.mentionsProducts ? 1 : 0,
        JSON.stringify(prospect.article.mentionsCompetitors),
        prospect.article.domain,
        prospect.author.name,
        prospect.author.publicEmail || null,
        prospect.author.linkedInUrl || null,
        prospect.author.twitterHandle || null,
        prospect.author.authorWebsite || null,
        prospect.author.bestContactMethod,
        prospect.author.isFreelance ? 1 : 0,
        prospect.author.isEditor ? 1 : 0,
        prospect.author.bio || null,
        prospect.score,
        JSON.stringify(prospect.scoreBreakdown),
        prospect.priority,
        prospect.outreach.angle,
        prospect.outreach.suggestedSubject,
        prospect.outreach.suggestedEmailDraft,
        prospect.outreach.estimatedResponseRate,
        prospect.createdAt.toISOString(),
        prospect.updatedAt.toISOString(),
      ]
    );

    this.save();
  }

  /**
   * Save multiple prospects with partial success support
   * @returns Object with counts of successful and failed saves
   */
  saveProspects(prospects: Prospect[]): { saved: number; failed: number; errors: string[] } {
    if (!this.db) throw new Error('Database not initialized');

    const result = { saved: 0, failed: 0, errors: [] as string[] };

    this.db.run('BEGIN TRANSACTION');
    try {
      for (const prospect of prospects) {
        try {
          this.saveProspect(prospect);
          result.saved++;
        } catch (err) {
          result.failed++;
          result.errors.push(`Failed to save ${prospect.article.url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      result.errors.push(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    this.save();
    return result;
  }

  /**
   * Get all prospects, optionally filtered
   */
  getProspects(options: {
    minScore?: number;
    priority?: string;
    limit?: number;
    orderBy?: 'score' | 'created_at';
  } = {}): Prospect[] {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM prospects WHERE 1=1';
    const params: any[] = [];

    if (options.minScore !== undefined) {
      sql += ' AND score >= ?';
      params.push(options.minScore);
    }

    if (options.priority) {
      sql += ' AND priority = ?';
      params.push(options.priority);
    }

    // Validate orderBy to prevent SQL injection
    const allowedOrderBy = ['score', 'created_at'];
    const orderBy = allowedOrderBy.includes(options.orderBy || 'score') 
      ? (options.orderBy || 'score') 
      : 'score';
    sql += ` ORDER BY ${orderBy} DESC`;

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const prospects: Prospect[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      prospects.push(this.rowToProspect(row));
    }
    stmt.free();

    return prospects;
  }

  /**
   * Get prospect by ID
   */
  getProspect(id: string): Prospect | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM prospects WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToProspect(row);
    }

    stmt.free();
    return null;
  }

  /**
   * Check if URL already exists
   */
  hasUrl(url: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT 1 FROM prospects WHERE url = ?');
    stmt.bind([url]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  }

  /**
   * Add contact history entry
   */
  addContactHistory(history: ContactHistory): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO contact_history (prospect_id, outreach_date, follow_up_date, response, outcome, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        history.prospectId,
        history.outreachDate.toISOString(),
        history.followUpDate?.toISOString() || null,
        history.response || null,
        history.outcome || null,
        history.notes,
      ]
    );

    this.save();
  }

  /**
   * Get contact history for a prospect
   */
  getContactHistory(prospectId: string): ContactHistory[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'SELECT * FROM contact_history WHERE prospect_id = ? ORDER BY outreach_date DESC'
    );
    stmt.bind([prospectId]);

    const history: ContactHistory[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      history.push({
        prospectId: row.prospect_id,
        outreachDate: new Date(row.outreach_date),
        followUpDate: row.follow_up_date ? new Date(row.follow_up_date) : undefined,
        response: row.response || undefined,
        outcome: row.outcome || undefined,
        notes: row.notes || '',
      });
    }
    stmt.free();

    return history;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byPriority: Record<string, number>;
    averageScore: number;
    contacted: number;
    responses: number;
  } {
    if (!this.db) throw new Error('Database not initialized');

    // Total count
    let stmt = this.db.prepare('SELECT COUNT(*) as count FROM prospects');
    stmt.step();
    const total = (stmt.getAsObject() as any).count || 0;
    stmt.free();

    // By priority
    stmt = this.db.prepare('SELECT priority, COUNT(*) as count FROM prospects GROUP BY priority');
    const byPriority: Record<string, number> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      byPriority[row.priority] = row.count;
    }
    stmt.free();

    // Average score
    stmt = this.db.prepare('SELECT AVG(score) as avg FROM prospects');
    stmt.step();
    const avgScore = (stmt.getAsObject() as any).avg || 0;
    stmt.free();

    // Contacted
    stmt = this.db.prepare('SELECT COUNT(DISTINCT prospect_id) as count FROM contact_history');
    stmt.step();
    const contacted = (stmt.getAsObject() as any).count || 0;
    stmt.free();

    // Responses
    stmt = this.db.prepare('SELECT COUNT(*) as count FROM contact_history WHERE response IS NOT NULL');
    stmt.step();
    const responses = (stmt.getAsObject() as any).count || 0;
    stmt.free();

    return {
      total,
      byPriority,
      averageScore: Math.round(avgScore * 10) / 10,
      contacted,
      responses,
    };
  }

  /**
   * Convert database row to Prospect object
   */
  private rowToProspect(row: any): Prospect {
    return {
      id: row.id,
      article: {
        title: row.title,
        url: row.url,
        publicationName: row.publication,
        publishDate: row.publish_date ? new Date(row.publish_date) : null,
        lastUpdated: row.last_updated ? new Date(row.last_updated) : null,
        excerpt: row.excerpt,
        fullText: row.full_text,
        wordCount: row.word_count,
        contentType: row.content_type,
        detectedTopics: JSON.parse(row.detected_topics || '[]'),
        mentionsProducts: !!row.mentions_products,
        mentionsCompetitors: JSON.parse(row.mentions_competitors || '[]'),
        domain: row.domain,
      },
      author: {
        name: row.author_name,
        publicEmail: row.author_email || undefined,
        linkedInUrl: row.author_linkedin || undefined,
        twitterHandle: row.author_twitter || undefined,
        authorWebsite: row.author_website || undefined,
        bestContactMethod: row.author_contact_method,
        isFreelance: !!row.author_is_freelance,
        isEditor: !!row.author_is_editor,
        bio: row.author_bio || undefined,
        worksForPublication: row.publication,
        contactNotes: '',
      },
      score: row.score,
      scoreBreakdown: JSON.parse(row.score_breakdown || '{}'),
      priority: row.priority,
      outreach: {
        score: row.score,
        priority: row.priority,
        angle: row.outreach_angle,
        opportunityReason: '',
        suggestedSubject: row.outreach_subject,
        suggestedEmailDraft: row.outreach_email_draft,
        contactMethod: row.author_contact_method,
        estimatedResponseRate: row.estimated_response_rate,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Default database instance
let defaultDb: ProspectDatabase | null = null;

export async function getDatabase(): Promise<ProspectDatabase> {
  if (!defaultDb) {
    defaultDb = new ProspectDatabase();
    await defaultDb.init();
  }
  return defaultDb;
}

export function closeDatabase(): void {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}

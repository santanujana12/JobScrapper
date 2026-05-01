import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'jobs.db');

export function initializeDatabase() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      applyUrl TEXT NOT NULL,
      email TEXT,
      source TEXT NOT NULL,
      salary TEXT,
      score REAL,
      embedding TEXT,
      postedAt INTEGER,
      scrapedAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(title, company, location, source)
    );
  `);

  // Migration: add postedAt to existing databases that predate this column
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN postedAt INTEGER;`);
  } catch (_) {
    // Column already exists — safe to ignore
  }

  // Scraping runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraping_runs (
      id TEXT PRIMARY KEY,
      resumeKeywords TEXT NOT NULL,
      jobFilters TEXT NOT NULL,
      status TEXT NOT NULL,
      totalJobs INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      completedAt INTEGER
    );
  `);

  // Jobs per run (linking table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS run_jobs (
      runId TEXT NOT NULL,
      jobId TEXT NOT NULL,
      PRIMARY KEY (runId, jobId),
      FOREIGN KEY (runId) REFERENCES scraping_runs(id),
      FOREIGN KEY (jobId) REFERENCES jobs(id)
    );
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON scraping_runs(status);
  `);

  return db;
}

export function getDatabase() {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

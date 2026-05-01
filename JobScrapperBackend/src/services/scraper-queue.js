import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/schema.js';
import { scrapeRemoteOk } from '../scrapers/remoteok.js';
import { scrapeRemotive } from '../scrapers/remotive.js';
import { scrapeArbeitnow } from '../scrapers/arbeitnow.js';
import { scrapeJobicy } from '../scrapers/jobicy.js';
import { scrapeHimalayas } from '../scrapers/himalayas.js';
import { matchJobs } from './matching.js';

// Shared in-memory task store (module-scoped closure)
const queue = new Map();

/**
 * Enqueue a new scraping task and start processing it immediately.
 * @param {Object} payload - { jobTitle, location, resumeKeywords }
 * @returns {string} taskId
 */
function enqueue(payload) {
  const id = uuidv4();
  const task = {
    id,
    payload,
    status: 'pending',
    jobs: [],
    createdAt: Date.now(),
  };
  queue.set(id, task);

  // Fire-and-forget: start processing without blocking the caller
  processTask(id).catch(err => console.error(`Task ${id} failed:`, err));

  return id;
}

/**
 * Process a queued scraping task by id.
 * @param {string} taskId
 */
async function processTask(taskId) {
  const task = queue.get(taskId);
  if (!task) return;

  task.status = 'in_progress';
  const db = getDatabase();

  try {
    const { jobTitle, location, resumeKeywords } = task.payload;

    console.log(`Starting scrape for ${jobTitle} in ${location} across multiple sites`);

    // Run all scrapers concurrently
    const [remoteOkResult, remotiveResult, arbeitnowResult, jobicyResult, himalayasResult] =
      await Promise.allSettled([
        scrapeRemoteOk(jobTitle, location),
        scrapeRemotive(jobTitle, location),
        scrapeArbeitnow(jobTitle, location),
        scrapeJobicy(jobTitle, location),
        scrapeHimalayas(jobTitle, location),
      ]);

    // Collect successfully scraped jobs and log per-source results
    const scraperResults = [
      { name: 'RemoteOK',   result: remoteOkResult },
      { name: 'Remotive',   result: remotiveResult },
      { name: 'Arbeitnow',  result: arbeitnowResult },
      { name: 'Jobicy',     result: jobicyResult },
      { name: 'Himalayas',  result: himalayasResult },
    ];

    let rawJobs = [];
    for (const { name, result } of scraperResults) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        console.log(`  ✓ ${name}: ${result.value.length} jobs`);
        rawJobs = rawJobs.concat(result.value);
      } else {
        console.warn(`  ✗ ${name}: failed —`, result.reason?.message ?? result.reason);
      }
    }

    console.log(`Total jobs found across all sites: ${rawJobs.length}`);

    // When no resume keywords are provided, fall back to jobTitle as the query.
    // Embedding an empty string produces a noise vector with meaningless similarity scores.
    const embeddingQuery = (resumeKeywords && resumeKeywords.trim())
      ? resumeKeywords
      : `${jobTitle} developer engineer software`;

    // Rank jobs against the query via semantic embedding
    const allMatched = await matchJobs(embeddingQuery, rawJobs);

    // Drop clearly irrelevant jobs. Threshold is intentionally low (0.30) so
    // jobs with short titles/descriptions from RemoteOK/Jobicy aren't unfairly
    // filtered vs Himalayas jobs that have richer text.
    const MIN_SCORE = 0.30;
    const matchedJobs = allMatched.filter(j => j.score >= MIN_SCORE);

    // Prepare statements
    const insertJob = db.prepare(`
      INSERT OR IGNORE INTO jobs
        (id, title, company, location, description, applyUrl, source, score, postedAt, scrapedAt, createdAt)
      VALUES
        (@id, @title, @company, @location, @description, @applyUrl, @source, @score, @postedAt, @scrapedAt, @createdAt)
    `);

    const getJobId = db.prepare(`
      SELECT id FROM jobs
      WHERE title = @title AND company = @company AND location = @location AND source = @source
      LIMIT 1
    `);

    const insertRun = db.prepare(`
      INSERT INTO scraping_runs (id, resumeKeywords, jobFilters, status, totalJobs, createdAt, completedAt)
      VALUES (@id, @resumeKeywords, @jobFilters, @status, @totalJobs, @createdAt, @completedAt)
    `);

    const linkRunJob = db.prepare(`
      INSERT OR IGNORE INTO run_jobs (runId, jobId) VALUES (@runId, @jobId)
    `);

    // Persist everything in a single atomic transaction
    db.transaction(() => {
      insertRun.run({
        id: task.id,
        resumeKeywords: resumeKeywords || '',
        jobFilters: JSON.stringify({ jobTitle, location }),
        status: 'completed',
        totalJobs: matchedJobs.length,
        createdAt: task.createdAt,
        completedAt: Date.now(),
      });

      for (const job of matchedJobs) {
        insertJob.run({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          applyUrl: job.applyUrl,
          source: job.source,
          score: job.score,
          postedAt: job.postedAt ?? null,
          scrapedAt: job.scrapedAt,
          createdAt: Date.now(),
        });

        // Resolve the actual stored id — INSERT OR IGNORE may have kept an older UUID
        const stored = getJobId.get({
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
        });

        if (stored) {
          linkRunJob.run({ runId: task.id, jobId: stored.id });
        }
      }
    })();

    task.jobs = matchedJobs;
    task.status = 'completed';
    console.log(`Task ${taskId} completed with ${matchedJobs.length} jobs.`);
  } catch (error) {
    console.error(`Error processing task ${taskId}:`, error);
    task.status = 'failed';
  }
}

/**
 * Get the current status/result of a task.
 * @param {string} taskId
 * @returns {Object|undefined}
 */
function getStatus(taskId) {
  return queue.get(taskId);
}

export const scraperQueue = { enqueue, getStatus };


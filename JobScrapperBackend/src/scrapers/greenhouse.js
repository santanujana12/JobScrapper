import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const companies = JSON.parse(
  readFileSync(path.join(__dirname, '../data/companies.json'), 'utf8')
).greenhouse;

const MAX_AGE_MS    = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE    = 15;   // concurrent requests per batch
const TIMEOUT_MS    = 10000;

// ---------------------------------------------------------------------------
// Per-company fetch
// ---------------------------------------------------------------------------
async function fetchCompanyJobs({ name, slug }, titleTokens, locationLower, cutoff) {
  const url = `https://boards.greenhouse.io/api/v1/boards/${slug}/jobs?content=true`;

  try {
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
    });

    const matched = [];
    for (const item of (data.jobs || [])) {
      const titleLower = (item.title || '').toLowerCase();

      // Title: at least one search token must appear in the job title
      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(t => titleLower.includes(t));
      if (!titleMatch) continue;

      // NOTE: We intentionally do NOT filter by location for ATS scrapers.
      // These are global company career pages. A user in India may still apply
      // to remote roles listed as "San Francisco" or "New York". The location
      // field is shown in the results table so users can decide for themselves.

      // Freshness: Greenhouse uses updated_at (ISO string)
      const postedAt = item.updated_at ? new Date(item.updated_at).getTime() : null;
      if (postedAt && postedAt < cutoff) continue;

      matched.push({
        id: uuidv4(),
        title:       item.title,
        company:     name,
        location:    item.location?.name || 'Remote',
        description: (item.content || '').replace(/<[^>]+>/g, '').slice(0, 1500),
        applyUrl:    item.absolute_url,
        source:      'greenhouse',
        postedAt,
        scrapedAt:   Date.now(),
      });
    }
    return matched;
  } catch (err) {
    // 404 = company not on Greenhouse or slug is wrong — skip silently
    if (err.response?.status !== 404) {
      console.warn(`  Greenhouse/${slug}: ${err.message}`);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public scraper
// ---------------------------------------------------------------------------
export async function scrapeGreenhouse(jobTitle, location) {
  const titleTokens  = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const locationLower = location ? location.toLowerCase() : '';
  const cutoff        = Date.now() - MAX_AGE_MS;

  console.log(`Scraping Greenhouse (${companies.length} companies) for: ${jobTitle}`);

  const allJobs = [];

  // Process in batches to avoid hammering the API
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch   = companies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(c => fetchCompanyJobs(c, titleTokens, locationLower, cutoff))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allJobs.push(...r.value);
    }
  }

  console.log(`Greenhouse: found ${allJobs.length} matching jobs`);
  return allJobs;
}

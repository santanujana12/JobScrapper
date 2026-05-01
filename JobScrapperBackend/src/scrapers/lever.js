import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const companies = JSON.parse(
  readFileSync(path.join(__dirname, '../data/companies.json'), 'utf8')
).lever;

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 15;
const TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// Per-company fetch
// ---------------------------------------------------------------------------
async function fetchCompanyJobs({ name, slug }, titleTokens, locationLower, cutoff) {
  // mode=json returns a clean JSON array instead of HTML
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;

  try {
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
    });

    const matched = [];
    for (const item of (Array.isArray(data) ? data : [])) {
      const titleLower = (item.text || '').toLowerCase();

      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(t => titleLower.includes(t));
      if (!titleMatch) continue;

      // No location filter — see greenhouse.js for rationale.

      // Lever uses createdAt (Unix ms)
      const postedAt = item.createdAt || null;
      if (postedAt && postedAt < cutoff) continue;

      // descriptionPlain is clean text; description is HTML
      const description = (item.descriptionPlain || item.description || '')
        .replace(/<[^>]+>/g, '')
        .slice(0, 1500);

      matched.push({
        id: uuidv4(),
        title:       item.text,
        company:     name,
        location:    item.categories?.location || 'Remote',
        description,
        // applyUrl — direct apply link; hostedUrl is the job listing page
        applyUrl:    item.applyUrl || item.hostedUrl,
        source:      'lever',
        postedAt,
        scrapedAt:   Date.now(),
      });
    }
    return matched;
  } catch (err) {
    if (err.response?.status !== 404) {
      console.warn(`  Lever/${slug}: ${err.message}`);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public scraper
// ---------------------------------------------------------------------------
export async function scrapeLever(jobTitle, location) {
  const titleTokens   = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const locationLower = location ? location.toLowerCase() : '';
  const cutoff        = Date.now() - MAX_AGE_MS;

  console.log(`Scraping Lever (${companies.length} companies) for: ${jobTitle}`);

  const allJobs = [];

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch   = companies.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(c => fetchCompanyJobs(c, titleTokens, locationLower, cutoff))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allJobs.push(...r.value);
    }
  }

  console.log(`Lever: found ${allJobs.length} matching jobs`);
  return allJobs;
}

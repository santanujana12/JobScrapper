import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const companies = JSON.parse(
  readFileSync(path.join(__dirname, '../data/companies.json'), 'utf8')
).ashby;

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 15;
const TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// Per-company fetch
// ---------------------------------------------------------------------------
async function fetchCompanyJobs({ name, slug }, titleTokens, locationLower, cutoff) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;

  try {
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
    });

    const matched = [];
    // Ashby wraps results in jobPostings[]
    for (const item of (data.jobPostings || [])) {
      const titleLower = (item.title || '').toLowerCase();

      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(t => titleLower.includes(t));
      if (!titleMatch) continue;

      // No location filter — see greenhouse.js for rationale.

      // publishedDate is an ISO string
      const postedAt = item.publishedDate ? new Date(item.publishedDate).getTime() : null;
      if (postedAt && postedAt < cutoff) continue;

      matched.push({
        id: uuidv4(),
        title:       item.title,
        company:     name,
        location:    item.locationName || (item.isRemote ? 'Remote' : 'Unknown'),
        // Ashby's listing API doesn't return description — use empty string;
        // the title + company are enough for semantic matching
        description: item.descriptionHtml
          ? item.descriptionHtml.replace(/<[^>]+>/g, '').slice(0, 1500)
          : `${item.title} at ${name}. Department: ${item.departmentName || 'N/A'}.`,
        applyUrl:    item.jobPostingUrl,
        source:      'ashby',
        postedAt,
        scrapedAt:   Date.now(),
      });
    }
    return matched;
  } catch (err) {
    if (err.response?.status !== 404) {
      console.warn(`  Ashby/${slug}: ${err.message}`);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public scraper
// ---------------------------------------------------------------------------
export async function scrapeAshby(jobTitle, location) {
  const titleTokens   = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const locationLower = location ? location.toLowerCase() : '';
  const cutoff        = Date.now() - MAX_AGE_MS;

  console.log(`Scraping Ashby (${companies.length} companies) for: ${jobTitle}`);

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

  console.log(`Ashby: found ${allJobs.length} matching jobs`);
  return allJobs;
}

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'https://arbeitnow.com/api/job-board-api';

/**
 * Scrape jobs from Arbeitnow's free public API (no auth required).
 * EU-focused, great for European location searches.
 * @param {string} jobTitle
 * @param {string} location
 * @returns {Promise<Array>}
 */
export async function scrapeArbeitnow(jobTitle, location) {
  const jobs = [];
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    console.log(`Scraping Arbeitnow for: ${jobTitle} in ${location}`);

    const titleTokens = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationLower = location ? location.toLowerCase() : '';

    // Fetch first two pages (50 jobs each) to maximise results
    const pages = [1, 2];
    for (const page of pages) {
      const response = await axios.get(BASE_URL, {
        params: { page },
        headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
        timeout: 15000,
      });

      const data = response.data?.data || [];

      for (const item of data) {
        const titleLower = (item.title || '').toLowerCase();
        const tagsLower = (item.tags || []).map(t => t.toLowerCase());
        const itemLocationLower = (item.location || '').toLowerCase();
        const isRemote = !!item.remote;

        // Title: at least one token must match title or tags
        const titleMatch =
          titleTokens.length === 0 ||
          titleTokens.some(
            token => titleLower.includes(token) || tagsLower.some(tag => tag.includes(token))
          );

        // Location: match country OR accept remote-flagged jobs only when no location given
        const locationMatch =
          !locationLower ||
          itemLocationLower.includes(locationLower) ||
          (!locationLower && isRemote);

        if (titleMatch && locationMatch) {
          // created_at is a Unix timestamp (seconds)
          const postedAt = item.created_at ? item.created_at * 1000 : null;
          if (postedAt && postedAt < cutoff) continue;

          jobs.push({
            id: uuidv4(),
            title: item.title,
            company: item.company_name,
            location: item.location || (isRemote ? 'Remote' : 'Unknown'),
            description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 1500),
            applyUrl: item.url,
            source: 'arbeitnow',
            postedAt,
            scrapedAt: Date.now(),
          });
        }
      }

      // Stop early if the page returned fewer than 50 items (last page)
      if (data.length < 50) break;
    }

    console.log(`Found ${jobs.length} jobs on Arbeitnow`);
  } catch (error) {
    console.error('Arbeitnow scraping error:', error.message);
  }

  return jobs;
}

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

/**
 * Scrape remote jobs from Jobicy's free public API (no auth required).
 * @param {string} jobTitle
 * @param {string} location
 * @returns {Promise<Array>}
 */
export async function scrapeJobicy(jobTitle, location) {
  const jobs = [];
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    console.log(`Scraping Jobicy for: ${jobTitle} in ${location}`);

    const titleTokens = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationLower = location ? location.toLowerCase() : '';

    const response = await axios.get(BASE_URL, {
      params: {
        count: 50,
        // `tag` filters by keyword in title/description
        ...(jobTitle ? { tag: jobTitle } : {}),
      },
      headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
      timeout: 15000,
    });

    const data = response.data?.jobs || [];

    for (const item of data) {
      const titleLower = (item.jobTitle || '').toLowerCase();
      const itemLocationLower = (item.jobGeo || '').toLowerCase();
      // jobGeo can be "Worldwide", "USA", "Europe", "Poland", etc.

      // Title: at least one token from jobTitle must appear
      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(token => titleLower.includes(token));

      // Location: country match OR accept Worldwide/remote only when no location specified
      const locationMatch =
        !locationLower ||
        itemLocationLower.includes(locationLower) ||
        itemLocationLower.includes('europe') && locationLower !== 'worldwide';

      if (titleMatch && locationMatch) {
        const postedAt = item.pubDate ? new Date(item.pubDate).getTime() : null;
        if (postedAt && postedAt < cutoff) continue;

        jobs.push({
          id: uuidv4(),
          title: item.jobTitle,
          company: item.companyName,
          location: item.jobGeo || 'Remote',
          description: (item.jobExcerpt || item.jobDescription || '').replace(/<[^>]+>/g, '').slice(0, 1500),
          applyUrl: item.url,
          source: 'jobicy',
          postedAt,
          scrapedAt: Date.now(),
        });
      }
    }

    console.log(`Found ${jobs.length} jobs on Jobicy`);
  } catch (error) {
    console.error('Jobicy scraping error:', error.message);
  }

  return jobs;
}

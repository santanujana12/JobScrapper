import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'https://himalayas.app/jobs/api';

/**
 * Scrape remote jobs from Himalayas' free public API (no auth required).
 *
 * Actual API fields (verified 2026-04-26):
 *   title, companyName, locationRestrictions[], applicationLink, guid,
 *   pubDate (Unix seconds), expiryDate (Unix seconds), excerpt, description
 *
 * @param {string} jobTitle
 * @param {string} location
 * @returns {Promise<Array>}
 */
export async function scrapeHimalayas(jobTitle, location) {
  const jobs = [];
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const nowSec     = Math.floor(Date.now() / 1000); // API dates are in seconds

  try {
    console.log(`Scraping Himalayas for: ${jobTitle} in ${location}`);

    const titleTokens = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationLower = location ? location.toLowerCase() : '';

    const response = await axios.get(BASE_URL, {
      params: {
        limit: 100,
        ...(jobTitle ? { q: jobTitle } : {}),
      },
      headers: { 'User-Agent': 'JobScraperAgent/1.0', Accept: 'application/json' },
      timeout: 15000,
    });

    const data = response.data?.jobs || [];

    for (const item of data) {
      // ── Expiry check ────────────────────────────────────────────────────
      // Skip jobs whose expiryDate has passed
      if (item.expiryDate && item.expiryDate < nowSec) continue;

      // ── Freshness check (30-day cap on pubDate) ─────────────────────────
      const postedAt = item.pubDate ? item.pubDate * 1000 : null;
      if (postedAt && Date.now() - postedAt > MAX_AGE_MS) continue;

      // ── Title match ─────────────────────────────────────────────────────
      const titleLower = (item.title || '').toLowerCase();
      const categoryLower = (item.categories || []).map(c => c.toLowerCase()).join(' ');

      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(token =>
          titleLower.includes(token) || categoryLower.includes(token)
        );

      // ── Location match ──────────────────────────────────────────────────
      // locationRestrictions is an array like ["United States", "United Kingdom"]
      const restrictions = (item.locationRestrictions || []).map(r => r.toLowerCase());
      const isWorldwide  = restrictions.length === 0;

      const locationMatch =
        !locationLower ||
        isWorldwide ||
        restrictions.some(r => r.includes(locationLower));

      if (titleMatch && locationMatch) {
        // Use applicationLink; fallback to guid (same value); final fallback to search page
        const applyUrl =
          item.applicationLink ||
          item.guid ||
          `https://himalayas.app/jobs?q=${encodeURIComponent(item.title || '')}`;

        jobs.push({
          id: uuidv4(),
          title: item.title,
          company: item.companyName,
          location: restrictions.length > 0 ? restrictions.join(', ') : 'Worldwide',
          description: (item.description || item.excerpt || '').replace(/<[^>]+>/g, '').slice(0, 1500),
          applyUrl,
          source: 'himalayas',
          postedAt,
          scrapedAt: Date.now(),
        });
      }
    }

    console.log(`Found ${jobs.length} jobs on Himalayas`);
  } catch (error) {
    console.error('Himalayas scraping error:', error.message);
  }

  return jobs;
}

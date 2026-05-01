import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scrape jobs from RemoteOK API
 * @param {string} jobTitle 
 * @param {string} location 
 * @returns {Promise<Array>}
 */
export async function scrapeRemoteOk(jobTitle, location) {
  const jobs = [];
  // Only include jobs posted within the last 30 days
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    console.log(`Scraping RemoteOK for: ${jobTitle} in ${location}`);
    
    // RemoteOK provides a JSON API
    const response = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'JobScraperAgent/1.0'
      },
      timeout: 15000
    });

    // The first item is usually a legal notice, rest are jobs
    const data = response.data.slice(1);
    
    // Split jobTitle into tokens so "React JS" matches "React Developer"
    const titleTokens = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationLower = location ? location.toLowerCase() : '';

    for (const item of data) {
      const positionLower = (item.position || '').toLowerCase();
      const tagsLower = (item.tags || []).map(t => t.toLowerCase());
      const itemLocationLower = (item.location || '').toLowerCase();

      // Title: at least one token from jobTitle must match position or tags
      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(token => positionLower.includes(token) || tagsLower.some(tag => tag.includes(token)));

      // Location: exact country match, OR accept Worldwide only when no location was specified
      const locationMatch =
        !locationLower ||
        itemLocationLower.includes(locationLower) ||
        (!locationLower && itemLocationLower.includes('worldwide'));

      if (titleMatch && locationMatch) {
        // RemoteOK epoch is Unix seconds — convert to ms
        const postedAt = item.epoch ? item.epoch * 1000 : null;
        // Skip jobs older than 30 days
        if (postedAt && postedAt < cutoff) continue;

        jobs.push({
          id: uuidv4(),
          title: item.position,
          company: item.company,
          location: item.location,
          description: (item.description || '').replace(/<[^>]+>/g, ''),
          // apply_url → direct application link; fall back to listing url
          applyUrl: item.apply_url || item.url,
          source: 'remoteok',
          postedAt,
          scrapedAt: Date.now(),
        });
      }
    }
    
    console.log(`Found ${jobs.length} jobs on RemoteOK`);
  } catch (error) {
    console.error('RemoteOK scraping error:', error.message);
  }
  
  return jobs;
}

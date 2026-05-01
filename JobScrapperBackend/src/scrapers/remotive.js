import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scrape jobs from Remotive API
 * @param {string} jobTitle 
 * @param {string} location 
 * @returns {Promise<Array>}
 */
export async function scrapeRemotive(jobTitle, location) {
  const jobs = [];
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    console.log(`Scraping Remotive for: ${jobTitle} in ${location}`);
    
    // Remotive provides a JSON API
    const response = await axios.get('https://remotive.com/api/remote-jobs', {
      params: {
        search: jobTitle || '' // They accept a search parameter
      },
      headers: {
        'User-Agent': 'JobScraperAgent/1.0'
      },
      timeout: 15000
    });

    const data = response.data.jobs || [];

    // Split jobTitle into tokens for post-filtering (API search is fuzzy)
    const titleTokens = jobTitle ? jobTitle.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationLower = location ? location.toLowerCase() : '';

    for (const item of data) {
      const titleLower = (item.title || '').toLowerCase();
      const itemLocationLower = (item.candidate_required_location || '').toLowerCase();

      // Title: at least one token from jobTitle must appear in job title
      const titleMatch =
        titleTokens.length === 0 ||
        titleTokens.some(token => titleLower.includes(token));

      // Location: exact country match, OR accept Worldwide only when no location was specified
      const locationMatch =
        !locationLower ||
        itemLocationLower.includes(locationLower) ||
        (!locationLower && itemLocationLower.includes('worldwide'));

      if (titleMatch && locationMatch) {
        const postedAt = item.publication_date ? new Date(item.publication_date).getTime() : null;
        if (postedAt && postedAt < cutoff) continue;

        jobs.push({
          id: uuidv4(),
          title: item.title,
          company: item.company_name,
          location: item.candidate_required_location,
          description: (item.description || '').replace(/<[^>]+>/g, ''),
          applyUrl: item.url,
          source: 'remotive',
          postedAt,
          scrapedAt: Date.now(),
        });
      }
    }
    
    console.log(`Found ${jobs.length} jobs on Remotive`);
  } catch (error) {
    console.error('Remotive scraping error:', error.message);
  }
  
  return jobs;
}

import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

const INDEED_BASE = 'https://www.indeed.com';

/**
 * Scrape Indeed job listings
 * @param {string} jobTitle
 * @param {string} location
 * @returns {Promise<Array>}
 */
export async function scrapeIndeed(jobTitle, location) {
  const jobs = [];

  try {
    const params = new URLSearchParams({
      q: jobTitle,
      l: location,
      sort: 'date',
      limit: '50',
    });

    const url = `${INDEED_BASE}/jobs?${params.toString()}`;
    console.log(`Scraping Indeed: ${url}`);

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };

    const response = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('[data-testid="job-result"], .jobsearch-ResultsList > li').each((_, element) => {
      try {
        const titleEl = $(element).find('[data-testid="jobTitle"], .jcs-JobTitle');
        const companyEl = $(element).find('[data-testid="company"], .companyName');
        const locationEl = $(element).find('[data-testid="job-location"], .companyLocation');
        const descriptionEl = $(element).find('.job-snippet');
        const applyLinkEl = titleEl.closest('a');

        const title = titleEl.text().trim();
        const company = companyEl.text().trim();
        const location_ = locationEl.text().trim();
        const description = descriptionEl.text().trim();
        const applyUrl = applyLinkEl.attr('href')
          ? (applyLinkEl.attr('href').startsWith('http') ? applyLinkEl.attr('href') : `${INDEED_BASE}${applyLinkEl.attr('href')}`)
          : '';

        if (title && company && applyUrl) {
          jobs.push({
            id: uuidv4(),
            title,
            company,
            location: location_,
            description,
            applyUrl,
            source: 'indeed',
            scrapedAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Error parsing Indeed job:', err.message);
      }
    });

    console.log(`Found ${jobs.length} jobs on Indeed`);
  } catch (error) {
    console.error('Indeed scraping error (Often blocked by CAPTCHA):', error.message);
  }

  return jobs;
}

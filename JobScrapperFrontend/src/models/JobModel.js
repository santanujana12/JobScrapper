import { api } from '../services/api';

/**
 * Functional Model for Job Data.
 */
export const createJobModel = () => {
  return {
    /**
     * Kick off a scraping task.
     * @param {{ jobTitle: string, location?: string, resumeKeywords?: string }} filters
     * @returns {Promise<{ taskId: string }>}
     */
    async scrape(filters) {
      if (!filters.jobTitle?.trim()) {
        throw new Error('Job title is required to scrape jobs');
      }
      return api.scrapeJobs(filters);
    },

    /**
     * Poll the status of a scraping task.
     * @param {string} taskId
     * @returns {Promise<{ id: string, status: string, jobs: object[] }>}
     */
    async checkStatus(taskId) {
      if (!taskId) throw new Error('Task ID is required');
      return api.getScrapingStatus(taskId);
    },
  };
};

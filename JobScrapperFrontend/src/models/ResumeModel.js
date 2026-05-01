import { api } from '../services/api';

/**
 * Functional Model for Resume data.
 * The GraphQL api layer handles File vs. string branching internally,
 * so this model simply forwards the raw input.
 */
export const createResumeModel = () => {
  return {
    /**
     * @param {File|string} resumeInput - PDF File object or plain-text string
     * @returns {Promise<import('../services/api').ResumeAnalysis>}
     */
    async analyze(resumeInput) {
      if (!resumeInput) throw new Error('Resume input is required');
      // Pass File or string directly — api.analyzeResume handles both
      return api.analyzeResume(resumeInput);
    },
  };
};

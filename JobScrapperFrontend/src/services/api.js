import axios from 'axios';

// Relative path: proxied by Next.js rewrites to http://localhost:5000/graphql
// This avoids CORS entirely — the browser only talks to the Next.js dev server.
const GRAPHQL_URL = '/graphql';

// ---------------------------------------------------------------------------
// Core request helpers
// ---------------------------------------------------------------------------

/**
 * Send a standard GraphQL query or mutation (JSON body).
 * @param {string} query  - GraphQL document string
 * @param {object} variables
 */
async function gqlRequest(query, variables = {}) {
  const response = await axios.post(
    GRAPHQL_URL,
    { query, variables },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { data, errors } = response.data;

  if (errors?.length) {
    const message = errors.map((e) => e.message).join(' | ');
    throw new Error(message);
  }

  return data;
}

/**
 * Send a GraphQL mutation that includes a file upload.
 * Follows the GraphQL multipart request spec:
 * https://github.com/jaydenseric/graphql-multipart-request-spec
 *
 * @param {string} query      - GraphQL mutation document
 * @param {object} variables  - Variables map; the File value must be null as a placeholder
 * @param {string} varPath    - Dot-path to the file variable, e.g. "file"
 * @param {File}   file       - The actual File object
 */
async function gqlUpload(query, variables, varPath, file) {
  const form = new FormData();

  // 1. operations — the GraphQL request with null placeholder for the file
  form.append('operations', JSON.stringify({ query, variables }));

  // 2. map — tells the server which variable the uploaded file maps to
  form.append('map', JSON.stringify({ '0': [`variables.${varPath}`] }));

  // 3. the actual file
  form.append('0', file);

  const response = await axios.post(GRAPHQL_URL, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const { data, errors } = response.data;

  if (errors?.length) {
    const message = errors.map((e) => e.message).join(' | ');
    throw new Error(message);
  }

  return data;
}

// ---------------------------------------------------------------------------
// GraphQL documents
// ---------------------------------------------------------------------------

const ANALYZE_RESUME_TEXT = /* GraphQL */ `
  mutation AnalyzeResumeText($text: String!) {
    analyzeResume(text: $text) {
      skills
      suggestedRoles
      keywords
      experienceLevel
      jobTitles
      locations
      summary
    }
  }
`;

const ANALYZE_RESUME_FILE = /* GraphQL */ `
  mutation AnalyzeResumeFile($file: Upload!) {
    analyzeResume(file: $file) {
      skills
      suggestedRoles
      keywords
      experienceLevel
      jobTitles
      locations
      summary
    }
  }
`;

const SCRAPE_JOBS = /* GraphQL */ `
  mutation ScrapeJobs($jobTitle: String!, $location: String, $resumeKeywords: String) {
    scrapeJobs(jobTitle: $jobTitle, location: $location, resumeKeywords: $resumeKeywords) {
      id
      status
    }
  }
`;

const JOB_STATUS = /* GraphQL */ `
  query JobStatus($taskId: ID!) {
    jobStatus(taskId: $taskId) {
      id
      status
      jobs {
        id
        title
        company
        location
        applyUrl
        source
        score
        matchReason
        postedAt
        scrapedAt
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Public API surface (same shape as the old REST api object)
// ---------------------------------------------------------------------------

export const api = {
  /**
   * Analyze a resume. Accepts a File (PDF) or plain-text string.
   * Returns the full ResumeAnalysis shape from the backend.
   */
  analyzeResume: async (resumeInput) => {
    if (resumeInput instanceof File) {
      const data = await gqlUpload(
        ANALYZE_RESUME_FILE,
        { file: null },
        'file',
        resumeInput
      );
      return data.analyzeResume;
    }

    // Plain-text string
    const data = await gqlRequest(ANALYZE_RESUME_TEXT, { text: resumeInput });
    return data.analyzeResume;
  },

  /**
   * Kick off a scraping job. Returns { id, status }.
   */
  scrapeJobs: async ({ jobTitle, location, resumeKeywords }) => {
    const data = await gqlRequest(SCRAPE_JOBS, {
      jobTitle,
      location: location || '',
      resumeKeywords: resumeKeywords || '',
    });
    // Normalise to the shape the controller expects: { taskId }
    return { taskId: data.scrapeJobs.id };
  },

  /**
   * Poll a scraping task. Returns { status, jobs[] }.
   */
  getScrapingStatus: async (taskId) => {
    const data = await gqlRequest(JOB_STATUS, { taskId });
    return data.jobStatus; // { id, status, jobs[] }
  },
};

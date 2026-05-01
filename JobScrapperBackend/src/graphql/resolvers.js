import { parseResume } from '../services/resume-parser.js';
import { scraperQueue } from '../services/scraper-queue.js';
import { GraphQLError } from 'graphql';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a graphql-yoga v5 Upload (Web API File) into a Node Buffer
 * so pdf-parse can consume it.
 *
 * graphql-yoga v5 resolves the Upload scalar to a Web API `File` object,
 * which exposes `arrayBuffer()` — NOT the old multer-style `createReadStream`.
 *
 * @param {File} file  - Resolved Web API File from the Upload scalar
 * @returns {Promise<Buffer>}
 */
async function uploadToBuffer(file) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Resolve the resume input from either a file upload or a plain-text string.
 * Throws a GraphQLError if neither is provided.
 *
 * Note: graphql-yoga passes Upload args as a Promise<File> — we await it here.
 */
async function resolveResumeInput(file, text) {
  if (file) {
    const resolvedFile = await file; // Unwrap the Promise<File>
    return uploadToBuffer(resolvedFile);
  }
  if (text && text.trim()) {
    return text;
  }
  throw new GraphQLError('You must provide either a PDF file upload or a text string.', {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}


// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

export const resolvers = {
  Query: {
    /**
     * Simple health check.
     */
    health: () => 'OK',

    /**
     * Poll a scraping task by its ID.
     * Returns null if the task doesn't exist (not a hard error — frontend can
     * treat null as "not started yet").
     */
    jobStatus: (_, { taskId }) => {
      const task = scraperQueue.getStatus(taskId);
      return task ?? null;
    },
  },

  Mutation: {
    /**
     * Analyze a resume with Gemini AI.
     * Accepts: PDF Upload scalar OR plain text string.
     */
    analyzeResume: async (_, { file, text }) => {
      const input = await resolveResumeInput(file, text);
      return parseResume(input);
    },

    /**
     * Manually enqueue a scraping job.
     * Returns the task object immediately (status = "pending").
     * Poll jobStatus(taskId) to get results.
     */
    scrapeJobs: (_, { jobTitle, location, resumeKeywords }) => {
      if (!jobTitle?.trim()) {
        throw new GraphQLError('jobTitle is required.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const taskId = scraperQueue.enqueue({
        jobTitle,
        location: location || '',
        resumeKeywords: resumeKeywords || '',
      });

      // Return a minimal task object immediately; the queue fills in jobs async
      return scraperQueue.getStatus(taskId);
    },

    /**
     * One-shot operation:
     * 1. Gemini analyzes the resume
     * 2. A scraping task is kicked off for each suggested role
     * Frontend polls each taskId for results.
     */
    analyzeAndScrape: async (_, { file, text, location }) => {
      const input = await resolveResumeInput(file, text);
      const analysis = await parseResume(input);

      const tasks = (analysis.suggestedRoles ?? []).map(role => ({
        role,
        taskId: scraperQueue.enqueue({
          jobTitle: role,
          location: location || '',
          resumeKeywords: analysis.keywords,
          suggestedRoles: analysis.suggestedRoles,
        }),
      }));

      return {
        analysis,
        tasks,
        message: `Resume analyzed. Scraping ${tasks.length} role(s): ${analysis.suggestedRoles.join(', ')}`,
      };
    },
  },

  // ── Field-level resolvers ─────────────────────────────────────────────────

  ScrapingTask: {
    // The in-memory task stores payload as a plain object — expose it directly
    payload: (task) => task.payload ?? null,
  },

  Job: {
    // Ensure score is always a number or null (never undefined)
    score: (job) => job.score ?? null,
    matchReason: (job) => job.matchReason ?? null,
  },
};

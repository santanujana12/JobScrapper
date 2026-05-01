export const typeDefs = /* GraphQL */ `
  scalar Upload

  # ── Resume Analysis ────────────────────────────────────────────────────────

  """AI-extracted profile data from a resume."""
  type ResumeAnalysis {
    """Technical and soft skills found in the resume."""
    skills: [String!]!
    """5 specific, searchable job titles Gemini recommends for this candidate."""
    suggestedRoles: [String!]!
    """Rich comma-separated keyword string used for semantic embedding matching."""
    keywords: String!
    """Inferred seniority: junior | mid | senior | lead | executive"""
    experienceLevel: String!
    """Job titles held in the candidate's work history."""
    jobTitles: [String!]!
    """Locations mentioned in the resume."""
    locations: [String!]!
    """2-3 sentence AI-generated professional summary."""
    summary: String!
  }

  # ── Jobs ───────────────────────────────────────────────────────────────────

  """A single job listing returned by a scraper."""
  type Job {
    id: ID!
    title: String!
    company: String!
    location: String!
    description: String!
    applyUrl: String!
    """Source board: remoteok | remotive | arbeitnow | jobicy | himalayas"""
    source: String!
    """Cosine similarity score against the resume embedding (0–1)."""
    score: Float
    """Human-readable match explanation."""
    matchReason: String
    """Unix ms timestamp of when the job was originally posted on the source board."""
    postedAt: Float
    scrapedAt: Float!
  }

  # ── Scraping Tasks ─────────────────────────────────────────────────────────

  """The original search parameters of a scraping task."""
  type TaskPayload {
    jobTitle: String
    location: String
  }

  """An in-memory scraping task tracked by the queue."""
  type ScrapingTask {
    id: ID!
    """pending | in_progress | completed | failed"""
    status: String!
    jobs: [Job!]!
    createdAt: Float!
    payload: TaskPayload
  }

  """A reference to a scraping task that was kicked off for one suggested role."""
  type TaskRef {
    role: String!
    taskId: ID!
  }

  """Result of the one-shot analyze-and-scrape operation."""
  type AnalyzeAndScrapeResult {
    analysis: ResumeAnalysis!
    """One task per suggested role (up to 5)."""
    tasks: [TaskRef!]!
    message: String!
  }

  # ── Queries ────────────────────────────────────────────────────────────────

  type Query {
    """Health check."""
    health: String!

    """Poll the status and results of a scraping task by its ID."""
    jobStatus(taskId: ID!): ScrapingTask
  }

  # ── Mutations ──────────────────────────────────────────────────────────────

  type Mutation {
    """
    Analyze a resume with Gemini AI.
    Pass either a PDF file upload OR a plain-text string (not both).
    """
    analyzeResume(file: Upload, text: String): ResumeAnalysis!

    """
    Manually kick off a scraping job for a specific title and location.
    resumeKeywords improves semantic ranking of results.
    """
    scrapeJobs(
      jobTitle: String!
      location: String
      resumeKeywords: String
    ): ScrapingTask!

    """
    One-shot operation:
    1. Analyze the resume with Gemini AI
    2. Immediately scrape all 5 suggested roles concurrently
    Returns the analysis + a taskId per role for polling.
    """
    analyzeAndScrape(
      file: Upload
      text: String
      location: String
    ): AnalyzeAndScrapeResult!
  }
`;

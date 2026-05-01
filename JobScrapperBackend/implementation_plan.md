# GraphQL Migration Plan

Replace the Express REST API layer with a **GraphQL Yoga** server. All business logic (scrapers, resume parser, embedding, DB) stays untouched — only the transport/routing layer changes.

## Why GraphQL Yoga (not Apollo Server v4)

| | Apollo Server v4 | **GraphQL Yoga** |
|---|---|---|
| File uploads | Manual workaround needed | ✅ Built-in multipart spec |
| ESM support | Partial | ✅ Full |
| Express required | Yes | No — standalone HTTP |
| Complexity | Higher | Lower |

GraphQL Yoga is the simplest drop-in for this stack.

---

## Proposed Changes

### 1. Dependencies

#### [MODIFY] [package.json](file:///D:/JobScrapper/JobScrapperBackend/package.json)
- Add `graphql`, `graphql-yoga`
- Remove `multer` (Yoga handles multipart uploads natively via the `Upload` scalar)
- Keep everything else (`express`, `cors` removed — no longer needed at app level)

---

### 2. GraphQL Schema & Resolvers

#### [NEW] `src/graphql/typeDefs.js`
Full SDL schema:
```graphql
scalar Upload

type ResumeAnalysis {
  skills: [String!]!
  suggestedRoles: [String!]!
  keywords: String!
  experienceLevel: String!
  jobTitles: [String!]!
  locations: [String!]!
  summary: String!
}

type Job {
  id: ID!
  title: String!
  company: String!
  location: String!
  description: String!
  applyUrl: String!
  source: String!
  score: Float
  matchReason: String
  scrapedAt: Float!
}

type TaskPayload {
  jobTitle: String
  location: String
}

type ScrapingTask {
  id: ID!
  status: String!
  jobs: [Job!]!
  createdAt: Float!
  payload: TaskPayload
}

type TaskRef {
  role: String!
  taskId: ID!
}

type AnalyzeAndScrapeResult {
  analysis: ResumeAnalysis!
  tasks: [TaskRef!]!
  message: String!
}

type Query {
  health: String!
  jobStatus(taskId: ID!): ScrapingTask
}

type Mutation {
  # Analyze a resume (PDF upload or raw text)
  analyzeResume(file: Upload, text: String): ResumeAnalysis!

  # Manually kick off a scrape job
  scrapeJobs(jobTitle: String!, location: String, resumeKeywords: String): ScrapingTask!

  # One-shot: analyze resume + scrape all suggested roles
  analyzeAndScrape(file: Upload, text: String, location: String): AnalyzeAndScrapeResult!
}
```

#### [NEW] `src/graphql/resolvers.js`
Maps queries/mutations to existing service functions. No scraper/parser/DB code changes.

#### [NEW] `src/graphql/schema.js`
Builds the executable schema from `typeDefs + resolvers`.

---

### 3. App Entry Point

#### [MODIFY] [app.js](file:///D:/JobScrapper/JobScrapperBackend/src/app.js)
Replace Express + cors + multer setup with a GraphQL Yoga server:
```js
import { createYoga } from 'graphql-yoga'
import { createServer } from 'http'
import { schema } from './graphql/schema.js'

const yoga = createYoga({ schema, graphiql: true })
const server = createServer(yoga)
server.listen(PORT, () => console.log(`GraphQL at http://localhost:${PORT}/graphql`))
```
- Built-in GraphiQL IDE at `/graphql` (dev tool, no separate Postman needed)
- CORS handled by Yoga config

---

### 4. Cleanup

#### [DELETE] `src/controllers/scraper.controller.js`
REST controller replaced entirely by GraphQL resolvers.

---

## REST → GraphQL Mapping

| Old REST endpoint | New GraphQL operation |
|---|---|
| `GET /` | `query { health }` |
| `POST /api/resume/analyze` | `mutation { analyzeResume(file: ...) }` |
| `POST /api/resume/analyze-and-scrape` | `mutation { analyzeAndScrape(file: ..., location: ...) }` |
| `POST /api/jobs/scrape` | `mutation { scrapeJobs(jobTitle: ..., location: ...) }` |
| `GET /api/jobs/status/:id` | `query { jobStatus(taskId: "...") { status jobs { ... } } }` |

---

## Frontend Impact

> [!IMPORTANT]
> The frontend (`JobScrapperFrontend`) currently calls REST endpoints via `axios`. All API calls will need to be updated to send GraphQL queries/mutations — typically via `axios.post('/graphql', { query: '...', variables: {...} })` or a GraphQL client.

---

## Verification Plan

### Automated
- Server starts without error
- GraphiQL UI loads at `http://localhost:5000/graphql`
- Run each operation via GraphiQL

### Manual Test Flow
1. `query { health }` → `"OK"`
2. `mutation { analyzeResume(text: "5 years React TypeScript...") { suggestedRoles skills } }`
3. `mutation { scrapeJobs(jobTitle: "React Developer", location: "Poland") { id status } }`
4. `query { jobStatus(taskId: "...") { status jobs { title company score } } }`
5. File upload via `analyzeAndScrape` mutation with multipart form

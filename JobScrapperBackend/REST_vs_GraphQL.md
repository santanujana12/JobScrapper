# REST vs GraphQL — Architecture Comparison

> This document captures the architectural differences introduced when the JobScrapper backend was migrated from Express REST to GraphQL Yoga.

---

## At a Glance

| Dimension | REST (Before) | GraphQL (After) |
|---|---|---|
| Protocol | HTTP verbs + URL paths | Single `POST /graphql` endpoint |
| Server framework | Express.js | GraphQL Yoga (Node HTTP) |
| File uploads | `multer` middleware | `Upload` scalar (multipart spec built-in) |
| Schema contract | Implicit (URL conventions) | Explicit SDL schema + introspection |
| Developer tooling | Postman / curl | GraphiQL IDE at `/graphql` |
| Over-fetching | Common (fixed response shape) | Eliminated (client selects fields) |
| Under-fetching | Multiple round-trips | Single query with nested fields |
| Error format | HTTP status codes + `{ error: "..." }` | `errors[]` array in GraphQL envelope |
| Type safety | Runtime only | Schema-enforced at parse time |

---

## Endpoint Mapping

| REST | Method | GraphQL Equivalent | Type |
|---|---|---|---|
| `/` | GET | `{ health }` | Query |
| `/api/resume/analyze` | POST | `analyzeResume(file/text)` | Mutation |
| `/api/resume/analyze-and-scrape` | POST | `analyzeAndScrape(file/text, location)` | Mutation |
| `/api/jobs/scrape` | POST | `scrapeJobs(jobTitle, location, resumeKeywords)` | Mutation |
| `/api/jobs/status/:id` | GET | `jobStatus(taskId)` | Query |

---

## Request / Response Examples

### Health Check

```http
# REST
GET http://localhost:5000/
```
```json
{ "message": "Job Scraper Backend is running" }
```

```graphql
# GraphQL
query {
  health
}
```
```json
{ "data": { "health": "OK" } }
```

---

### Analyze Resume (text)

```http
# REST
POST /api/resume/analyze
Content-Type: application/json

{ "text": "5 years React TypeScript experience..." }
```

```graphql
# GraphQL
mutation {
  analyzeResume(text: "5 years React TypeScript experience...") {
    skills
    suggestedRoles
    experienceLevel
    summary
  }
}
```

> **GraphQL advantage**: Client asks only for `suggestedRoles` — no bandwidth wasted on `keywords` or `jobTitles` if not needed.

---

### Analyze Resume (PDF upload)

```http
# REST — multipart/form-data
POST /api/resume/analyze
Content-Type: multipart/form-data
[resume: <binary PDF>]
```

```http
# GraphQL — same multipart spec, different mutation
POST /graphql
Content-Type: multipart/form-data
operations: {"query":"mutation($file:Upload!){analyzeResume(file:$file){suggestedRoles skills}}","variables":{"file":null}}
map: {"0":["variables.file"]}
0: <binary PDF>
```

---

### Poll Job Status

```http
# REST
GET /api/jobs/status/abc-123
```
```json
{
  "id": "abc-123",
  "status": "completed",
  "jobs": [
    { "id": "...", "title": "...", "company": "...", "score": 0.87, ... }
  ],
  "payload": { "jobTitle": "React Developer", "location": "Poland" }
}
```

```graphql
# GraphQL — fetch exactly what the UI needs
query {
  jobStatus(taskId: "abc-123") {
    status
    jobs {
      title
      company
      score
      applyUrl
      source
    }
  }
}
```

> **GraphQL advantage**: `description` (large text) is omitted from the query → response is 10× smaller for a list view.

---

## Dependency Changes

| Package | REST | GraphQL | Reason |
|---|---|---|---|
| `express` | ✅ Required | ❌ Removed | Replaced by Yoga's HTTP server |
| `cors` | ✅ Required | ❌ Removed | Handled by Yoga `cors` option |
| `multer` | ✅ Required | ❌ Removed | Replaced by `Upload` scalar |
| `graphql` | ❌ Not used | ✅ Added | Core GraphQL runtime |
| `graphql-yoga` | ❌ Not used | ✅ Added | GraphQL server + file upload |

---

## File Structure Changes

```diff
 src/
   app.js                          ← rewritten (Express → Yoga HTTP server)
+  graphql/
+    typeDefs.js                   ← SDL schema (new)
+    resolvers.js                  ← query/mutation handlers (new)
+    schema.js                     ← assembles executable schema (new)
-  controllers/
-    scraper.controller.js         ← deleted (replaced by resolvers)
   services/                       ← unchanged
   scrapers/                       ← unchanged
   db/                             ← unchanged
```

---

## Why GraphQL Yoga over Apollo Server v4?

| | Apollo Server v4 | GraphQL Yoga v5 |
|---|---|---|
| File uploads | Requires `graphql-upload` workaround | ✅ Built-in multipart spec |
| ESM (`"type":"module"`) | Partial support | ✅ Full native ESM |
| Express dependency | Required | Optional (standalone HTTP) |
| Bundle size | ~4.5 MB | ~1.2 MB |
| GraphiQL | Separate package | ✅ Built-in |
| Setup boilerplate | High | Minimal |

---

## Frontend Integration Guide

All API calls change from multiple REST endpoints to a single `/graphql` endpoint.

### Before (axios REST)
```js
// Analyze resume
const res = await axios.post('/api/resume/analyze', formData);

// Poll status
const res = await axios.get(`/api/jobs/status/${taskId}`);
```

### After (axios GraphQL)
```js
// Analyze resume
const res = await axios.post('/graphql', {
  query: `mutation AnalyzeResume($file: Upload!) {
    analyzeResume(file: $file) {
      suggestedRoles skills experienceLevel summary
    }
  }`,
  variables: { file: null },
}, { /* multipart map handled by graphql-request or manual form */ });

// Poll status
const res = await axios.post('/graphql', {
  query: `query JobStatus($id: ID!) {
    jobStatus(taskId: $id) {
      status
      jobs { title company score applyUrl source }
    }
  }`,
  variables: { id: taskId },
});
const task = res.data.data.jobStatus;
```

> **Tip**: Use [`graphql-request`](https://github.com/jasonkuhrt/graphql-request) on the frontend for cleaner GraphQL calls — it handles the `Content-Type` header and response unwrapping automatically.

---

## GraphQL Error Handling

GraphQL always returns HTTP `200`. Errors appear in the `errors` array:

```json
{
  "data": null,
  "errors": [
    {
      "message": "You must provide either a PDF file upload or a text string.",
      "extensions": { "code": "BAD_USER_INPUT" }
    }
  ]
}
```

The frontend should check `response.data.errors` in addition to HTTP status.

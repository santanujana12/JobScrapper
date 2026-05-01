import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/schema.js';
import { schema } from './graphql/schema.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize SQLite database on startup
initializeDatabase();

// Create GraphQL Yoga instance
const yoga = createYoga({
  schema,
  // GraphiQL explorer enabled in all environments for this project
  graphiql: true,
  cors: {
    origin: '*',
    credentials: true,
  },
  // Needed for multipart file uploads (PDF resume upload)
  multipart: true,
});

// Attach Yoga to a plain Node HTTP server
const server = createServer(yoga);

server.listen(PORT, () => {
  console.log(`🚀 GraphQL server running at http://localhost:${PORT}/graphql`);
  console.log(`🔍 GraphiQL IDE available at http://localhost:${PORT}/graphql`);
});

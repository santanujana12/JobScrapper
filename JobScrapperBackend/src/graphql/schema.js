import { createSchema } from 'graphql-yoga';
import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';

/**
 * Executable GraphQL schema built from SDL type definitions and resolver map.
 * graphql-yoga's createSchema wires the Upload scalar automatically.
 */
export const schema = createSchema({ typeDefs, resolvers });

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function getEmbedding(text) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY provided. Using mock embedding.");
      // Return a random vector for mock if no API key
      return Array(768).fill(0).map(() => Math.random());
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding error:', error);
    // Return mock on failure to avoid crashing the whole scrape
    return Array(768).fill(0).map(() => Math.random());
  }
}

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

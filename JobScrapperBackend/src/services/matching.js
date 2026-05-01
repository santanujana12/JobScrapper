import { getEmbedding, cosineSimilarity } from './embedding.js';

export async function matchJobs(resumeKeywords, jobs) {
  try {
    const resumeEmbedding = await getEmbedding(resumeKeywords);
    const results = [];

    for (const job of jobs) {
      const jobText = `${job.title} ${job.company} ${job.description}`;
      const jobEmbedding = await getEmbedding(jobText);

      const similarityScore = cosineSimilarity(resumeEmbedding, jobEmbedding);
      const normalizedScore = Math.max(0, Math.min(1, similarityScore));

      results.push({
        ...job,
        score: normalizedScore,
        matchReason: `Semantic similarity: ${(normalizedScore * 100).toFixed(1)}%`,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Matching error:', error);
    throw error;
  }
}

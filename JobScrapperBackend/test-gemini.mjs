import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Try models in order of preference
for (const modelName of ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest']) {
  try {
    console.log(`Testing ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "works" in JSON: {"status":"works"}');
    console.log(`✓ ${modelName} works:`, result.response.text().slice(0, 80));
    break;
  } catch (e) {
    console.log(`✗ ${modelName}:`, e.message.slice(0, 100));
  }
}

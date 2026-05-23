import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Resilient API calling with exponential backoff retry for transient 503 / high demand errors
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransientError = 
      error.status === 503 || 
      error.code === 503 || 
      error.status === 429 ||
      error.code === 429 ||
      String(error).includes("503") || 
      String(error).includes("429") || 
      String(error).includes("UNAVAILABLE") || 
      String(error).includes("high demand") ||
      String(error).includes("RESOURCE_EXHAUSTED");

    if (retries > 0 && isTransientError) {
      console.warn(`Gemini API temporary issue, retrying in ${delay}ms... (${retries} attempts remaining). Error:`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateAIQuestions(text: string, language: string) {
  const ai = getAi();
  const prompt = `You are an expert educational assessment creator. Based ONLY on the following text (in ${language}), generate exactly 9 comprehension questions:
  
  1. EASY (3 questions):
     - Types: ONLY "multiple-choice" or "true-false".
     - Style: Simple, direct, testing basic facts.
     - Points: 2 each.
     
  2. MEDIUM (3 questions):
     - Types: ONLY "multiple-choice" or "true-false".
     - Style: Require inference, include distractor answers, moderately challenging.
     - Points: 4 each.
     
  3. HARD (3 questions):
     - Types: "short-answer" (highly preferred) or analytical "multiple-choice".
     - Style: Test real understanding, reasoning, structural purpose, or theme.
     - Points: 6 each.
     - Include: "modelAnswer" and "aiRubric" (grading criteria) for short-answer types.

  MCQ Rules: Exactly 1 correct answer and 3 similar distractors.
  T/F Rules: Simple, non-ambiguous.
  
  Return as a JSON array of objects with fields: 
  text, type, options (for MCQ), correctAnswer (string), difficulty, explanation, points, modelAnswer, aiRubric.

  Text:
  ${text}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["multiple-choice", "true-false", "short-answer"] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
            explanation: { type: Type.STRING },
            modelAnswer: { type: Type.STRING },
            aiRubric: { type: Type.STRING }
          },
          required: ["text", "type", "correctAnswer", "difficulty"]
        }
      }
    }
  }));

  return JSON.parse(response.text || "[]");
}

export async function evaluateAIShortAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  textContext: string,
  rubric?: string
) {
  const ai = getAi();
  const prompt = `Evaluate the following user answer for a reading comprehension question.
  Reading Text: ${textContext}
  Question: ${question}
  Sample Correct Answer: ${correctAnswer}
  ${rubric ? `Grading Rubric: ${rubric}` : ''}
  User's Answer: ${userAnswer}

  Assign a score from 0.0 to 1.0 (where 1.0 is perfectly correct meaning-wise, 0.5 is partially correct, 0.0 is wrong). 
  Use the rubric strictly if provided.
  Be fair but rigorous. If the meaning matches, give high credit even if phrasing is different.
  Provide brief educational feedback in Arabic (Egyptian dialect). Speak directly to the student. 
  If they are close, tell them what they missed. If they are wrong, explain the concept briefly.
  Return as JSON.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["score", "feedback"]
      }
    }
  }));

  return JSON.parse(response.text || "{}");
}

export async function generateAIHint(
  question: string,
  textContext: string,
  previousUserAnswer?: string
) {
  const ai = getAi();
  const prompt = `Provide a subtle hint for the following question based on the text. 
  Do NOT give the answer. Guide the student's thinking.
  Question: ${question}
  Context: ${textContext}
  ${previousUserAnswer ? `The student previously tried: "${previousUserAnswer}" and was wrong. Guide them away from this error.` : ""}
  
  Feedback should be in Egyptian Arabic, encouraging and brief (one sentence).
  Return as a JSON object with a "hint" string.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hint: { type: Type.STRING }
        },
        required: ["hint"]
      }
    }
  }));

  return JSON.parse(response.text || '{"hint": "فكر في سياق النص، الإجابة موجودة بوضوح."}');
}

export async function refineQuestionWithAI(question: any, textContext: string, action: 'explain' | 'harder' | 'easier') {
  const ai = getAi();
  const prompt = `Refine this educational question.
  Action: ${action}
  Question: ${JSON.stringify(question)}
  Source Text: ${textContext}

  Return the updated question object in JSON format.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json"
    }
  }));

  return JSON.parse(response.text || "{}");
}

export async function getAIInsightsFromServer(stats: any) {
  const ai = getAi();
  const prompt = `Based on student stats: ${JSON.stringify(stats)}, provide 3 encouraging educational insights in Egyptian Arabic. Use bullet points. Ensure it is short and direct.`;
  
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  }));
  return response.text || "استمر في التقدم، أنت تبلي بلاءً حسناً!";
}

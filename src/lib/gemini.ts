export interface GeneratedQuestion {
  text: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  options?: string[];
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  explanation?: string;
  points?: number;
  modelAnswer?: string;
  aiRubric?: string;
}

export async function generateQuestions(text: string, language: string): Promise<GeneratedQuestion[]> {
  const response = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "AI Generation failed");
  }

  return response.json();
}

export async function evaluateShortAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  textContext: string,
  rubric?: string
): Promise<{ score: number; feedback: string }> {
  try {
    const response = await fetch("/api/gemini/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        correctAnswer,
        userAnswer,
        textContext,
        rubric,
      }),
    });

    if (!response.ok) {
       throw new Error("Server evaluation failed");
    }

    return response.json();
  } catch (err) {
    console.warn("AI Eval failed, using fallback:", err);
    
    // Programmatic Fallback: Simple keyword overlap check
    const userWords = userAnswer.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
    const correctWords = correctAnswer.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
    
    if (userWords.length === 0) return { score: 0, feedback: "لم يتم تقديم إجابة." };

    let matchCount = 0;
    userWords.forEach(w => {
      if (correctWords.some(cw => cw.includes(w) || w.includes(cw))) matchCount++;
    });

    const matchRatio = matchCount / (correctWords.length || 1);
    const score = matchRatio > 0.6 ? 1.0 : (matchRatio > 0.3 ? 0.5 : 0.0);
    
    return {
      score,
      feedback: "نظام التقييم الذكي تحت ضغط حالياً. تم تصحيح السؤال بناءً على الكلمات المفتاحية وسيقوم المعلم بمراجعة التقييم."
    };
  }
}

export async function getAIInsights(stats: any): Promise<string> {
  try {
    const response = await fetch("/api/gemini/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats }),
    });

    if (!response.ok) {
       throw new Error("Server insights failed");
    }

    const data = await response.json();
    return data.insights;
  } catch (err) {
    console.warn("AI Insights failed:", err);
    return "• استمر في حل الاختبارات بانتظام لتحسين مستواك.\n• ركز على مراجعة الأسئلة الصعبة التي أخطأت فيها.\n• التزامك بالحل اليومي هو سر نجاحك!";
  }
}

export async function getAIHint(
  question: string,
  textContext: string,
  previousUserAnswer?: string
): Promise<string> {
  try {
    const response = await fetch("/api/gemini/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, textContext, previousUserAnswer }),
    });
    const data = await response.json();
    return data.hint;
  } catch (err) {
    return "حاول تقرأ السؤال بتركيز أكبر، الإجابة في تفاصيل النص.";
  }
}

export async function refineQuestion(
  question: any,
  textContext: string,
  action: 'explain' | 'harder' | 'easier'
): Promise<any> {
  const response = await fetch("/api/gemini/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, textContext, action }),
  });
  return response.json();
}


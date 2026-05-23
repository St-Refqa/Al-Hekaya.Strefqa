import express from "express";
import path from "path";
import dotenv from "dotenv";
import { 
  generateAIQuestions, 
  evaluateAIShortAnswer, 
  getAIInsightsFromServer, 
  generateAIHint, 
  refineQuestionWithAI 
} from "./server/gemini";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { text, language } = req.body;
      const questions = await generateAIQuestions(text, language);
      res.json(questions);
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/evaluate", async (req, res) => {
    try {
      const { question, correctAnswer, userAnswer, textContext, rubric } = req.body;
      const evaluation = await evaluateAIShortAnswer(
        question,
        correctAnswer,
        userAnswer,
        textContext,
        rubric
      );
      res.json(evaluation);
    } catch (error: any) {
      console.error("Gemini Evaluation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/insights", async (req, res) => {
    try {
      const { stats } = req.body;
      const insights = await getAIInsightsFromServer(stats);
      res.json({ insights });
    } catch (error: any) {
      console.error("Gemini Insights Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/hint", async (req, res) => {
    try {
      const { question, textContext, previousUserAnswer } = req.body;
      const hint = await generateAIHint(question, textContext, previousUserAnswer);
      res.json(hint);
    } catch (error: any) {
      console.error("Gemini Hint Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/refine", async (req, res) => {
    try {
      const { question, textContext, action } = req.body;
      const refined = await refineQuestionWithAI(question, textContext, action);
      res.json(refined);
    } catch (error: any) {
      console.error("Gemini Refine Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});

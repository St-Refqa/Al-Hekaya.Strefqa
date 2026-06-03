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
import { runNotificationWorker } from "./server/notificationWorker";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/system/dispatch", async (req, res) => {
    try {
      const { recipients, message } = req.body;
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "No recipients provided" });
      }
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
      const token = process.env.ULTRAMSG_TOKEN;

      const results = [];

      for (const phone of recipients) {
        // Clean phone number: keep only digits
        let cleanedPhone = phone.trim().replace(/[^\d]/g, "");
        
        // Egyptian numbers need country code 20. If it starts with "01" (11 digits), prepend "20" instead of "0" (or "2" if "0" is stripped, wait: let's be careful).
        // Let's standardise Egyptian numbers: if 01... (11 digits), replace leading "0" or prefix with "2" if it has "01" -> "201..."
        if (cleanedPhone.startsWith("01") && cleanedPhone.length === 11) {
          cleanedPhone = "2" + cleanedPhone; // e.g. 01055082964 becomes 201055082964
        } else if (cleanedPhone.startsWith("1") && cleanedPhone.length === 10) {
          cleanedPhone = "20" + cleanedPhone; // in case someone omitted the leading zero
        } else if (cleanedPhone.startsWith("00201") && cleanedPhone.length === 14) {
          cleanedPhone = cleanedPhone.slice(2);
        }

        if (!instanceId || !token) {
          // Mock mode: Write to system console cleanly
          const mockLog = `[WHATSAPP MESSAGE SENDER] FROM: 01055082964 | TO: +${cleanedPhone} | CONTENT: "${message}"`;
          console.log(mockLog);
          results.push({ phone, status: "mock_sent", payload: mockLog });
          continue;
        }

        try {
          const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              token,
              to: cleanedPhone,
              body: message
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const responseData = await response.json();
          results.push({ phone, status: "sent", apiResponse: responseData });
        } catch (err: any) {
          console.error(`Failed to send WhatsApp message to ${phone}:`, err);
          results.push({ phone, status: "failed", error: err.message });
        }
      }

      res.json({ success: true, results, count: results.length });
    } catch (error: any) {
      console.error("WhatsApp sending error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/system/check-reminders", async (req, res) => {
    try {
      await runNotificationWorker();
      res.json({ success: true, message: "Server-side notification cycle executed successfully." });
    } catch (error: any) {
      console.error("Error triggering manual notification check:", error);
      res.status(500).json({ error: error.message });
    }
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

  // Vite middleware and listener bootstrap function
  async function bootstrap() {
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

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
        
        // Start server-side notification worker checks (Runs immediately, then every 5 minutes)
        runNotificationWorker().catch(err => console.error("Error in initial notification worker cycle:", err));
        setInterval(() => {
          runNotificationWorker().catch(err => console.error("Error in scheduled notification worker cycle:", err));
        }, 5 * 60 * 1000);
      });
    }
  }

  bootstrap().catch(err => {
    console.error("Critical error during bootstrap:", err);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  });

export default app;

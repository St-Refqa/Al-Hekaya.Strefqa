import express from "express";
import { 
  generateAIQuestions, 
  evaluateAIShortAnswer, 
  getAIInsightsFromServer, 
  generateAIHint, 
  refineQuestionWithAI 
} from "../server/gemini";
import { runNotificationWorker } from "../server/notificationWorker";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Express route mapping for Vercel Serverless Function
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
      let cleanedPhone = phone.trim().replace(/[^\d]/g, "");
      
      if (cleanedPhone.startsWith("01") && cleanedPhone.length === 11) {
        cleanedPhone = "2" + cleanedPhone;
      } else if (cleanedPhone.startsWith("1") && cleanedPhone.length === 10) {
        cleanedPhone = "20" + cleanedPhone;
      } else if (cleanedPhone.startsWith("00201") && cleanedPhone.length === 14) {
        cleanedPhone = cleanedPhone.slice(2);
      }

      if (!instanceId || !token) {
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

export default app;

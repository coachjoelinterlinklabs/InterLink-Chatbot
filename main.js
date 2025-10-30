// main.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) console.warn("⚠️ GEMINI_API_KEY not set!");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });

    const SYSTEM_PROMPT = `
Primary Function: You are Coach Joel AI who helps the InterLink Community, especially Global Ambassadors. Provide friendly and efficient replies, ask clarifying questions if unclear, and end on a positive note.

Style rules:
- Concise, professional, direct
- Use plain text or emoji bullets (✅, 🔹, 🔸)
- Numbered lists 1., 2., 3. instead of asterisks
- End with encouragement
`;

    const body = {
      messages: [
        { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "text", text: prompt }] }
      ],
      temperature: 0.2,
      candidateCount: 1,
      topP: 0.95
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-chat:generateMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    console.log("Raw API response:", JSON.stringify(data, null, 2));

    // Correct path for Chat API response
    const text = data?.candidates?.[0]?.message?.content?.[0]?.text?.trim() || "No response from API";

    res.json({ success: true, text });

  } catch (err) {
    console.error("❌ Error generating:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// main.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) console.warn("⚠️ GEMINI_API_KEY not set!");

// SYSTEM PROMPT
const SYSTEM_PROMPT = `Role:
- Primary Function: You are Coach Joel AI who helps the InterLink Community, especially Global Ambassadors...
...Database:
All InterLink Matters Database will be in the text format soon.`;

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Generate endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });

    const contents = [
      { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "user", parts: [{ text: prompt }] }
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-live:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY
        },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 } // adjust tokens as needed
        })
      }
    );

    const data = await response.json();

    console.log("📄 Gemini API response:", JSON.stringify(data, null, 2));

    // Robust text extraction
    let text = "No response";
    if (data?.candidates?.length > 0) {
      text = data.candidates[0]?.content?.parts?.map(p => p.text).join("\n") || text;
    } else if (data?.output?.length > 0) {
      text = data.output[0]?.contents?.map(c => c.parts.map(p => p.text).join("\n")).join("\n") || text;
    }

    res.json({ success: true, text });

  } catch (err) {
    console.error("❌ Error generating:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

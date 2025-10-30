// main.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // Load GEMINI_API_KEY from .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🟢 Starting main.js...");

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));

// Allow CORS for frontend
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) console.warn("⚠️ GEMINI_API_KEY not set!");

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint for your bot
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });

    const SYSTEM_PROMPT = `
Primary Function: You are Coach Joel AI who helps the InterLink Community, especially Global Ambassadors, with inquiries, issues, and requests in the InterLink Community and Ambassador Program Level 5 System. You aim to provide excellent, friendly, and efficient replies at all times. Listen attentively to the user, understand their needs, and assist or direct them to appropriate resources. If a question is unclear, ask clarifying questions. End replies with a positive note.

Style rules:
- Be concise, professional, and direct. Do not use asterisks (*) or markdown bold syntax (**).
- Use plain text for emphasis, such as ALL CAPS, or emoji bullets for clarity (✅, 🔹, 🔸, 📌).
- When listing steps or winners, use numbered lists (1., 2., 3.) or emoji bullets, not asterisks or markdown.
- Use spacing and margins for clarity without asterisks.
- End with a brief encouraging sentence.
- If sending a link, analyze whether it is legit and official in InterLink. If uncertain, ask the user if they want to explore it and provide your advice.

Constraints:
1. Use multiple languages if the user wants translation.
2. Stay focused on InterLink Labs Project. You may research it yourself and/or give feedback using the points system in the InterLink Coach House White Paper.
3. If information is missing, ask a clarifying question.
4. If outside scope, politely decline and refer to official resources.
`;

    // Gemini expects "messages" array with role + text
    const messages = [
      { role: "system", text: SYSTEM_PROMPT },
      { role: "user", text: prompt }
    ];

    // Use native fetch (Node 18+)
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY
        },
        body: JSON.stringify({
          messages,               // Correct structure
          temperature: 0.2,
          maxOutputTokens: 1000
        })
      }
    );

    // Parse response safely
    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error("❌ Error parsing JSON:", jsonErr);
      return res.status(500).json({ success: false, error: "Invalid JSON from API" });
    }

    console.log("Raw API response:", JSON.stringify(data, null, 2)); // Debug

    const text =
      data?.candidates?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      "No response";

    res.json({ success: true, text });

  } catch (err) {
    console.error("❌ Error generating:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
try {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
} catch (err) {
  console.error("❌ Server failed to start:", err);
}

import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 10000);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const languageNames = {
  auto: "auto-detect",
  th: "Thai",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean"
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "live-subtitle-obs" });
});

app.post("/api/transcribe-translate", upload.single("audio"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file received." });
    }

    const inputLanguage = req.body.inputLanguage || "auto";
    const targetLanguage = req.body.targetLanguage || "en";

    const extension = req.file.mimetype?.includes("mp4") ? "mp4" : "webm";
    const tempPath = path.join("/tmp", `subtitle-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`);

    await fs.writeFile(tempPath, req.file.buffer);

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: await import("fs").then(({ createReadStream }) => createReadStream(tempPath)),
        model: process.env.TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
        ...(inputLanguage !== "auto" ? { language: inputLanguage } : {})
      });

      const original = cleanText(transcription.text);

      if (!original) {
        return res.json({ original: "", translated: "", inputLanguage, targetLanguage });
      }

      if (targetLanguage === "same") {
        return res.json({
          original,
          translated: original,
          inputLanguage,
          targetLanguage
        });
      }

      const targetName = languageNames[targetLanguage] || targetLanguage;
      const translation = await openai.responses.create({
        model: process.env.TRANSLATION_MODEL || "gpt-4.1-mini",
        instructions:
          `You are a live subtitle translator. Translate the user's transcript into ${targetName}. ` +
          `Return ONLY the translated subtitle text. Preserve names, event names, brand names, Roblox names, ` +
          `numbers and URLs when appropriate. Do not explain anything. Keep it natural and concise for subtitles.`,
        input: original
      });

      const translated = cleanText(translation.output_text);

      res.json({
        original,
        translated: translated || original,
        inputLanguage,
        targetLanguage
      });
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    console.error("subtitle error:", error);
    res.status(500).json({
      error: error?.message || "Subtitle processing failed."
    });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Live Subtitle listening on port ${port}`);
});

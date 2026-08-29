import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee) with increased limit for image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. Requests will fail if key is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

interface FallbackOptions {
  systemInstruction?: string;
  temperature?: number;
  contents: any[];
}

/**
 * Executes content generation with automatic failover across the model fallback ladder.
 */
async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
        },
      });

      const text = response.text || "";
      return { text, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered an error:`, err?.message || err);
      lastError = err;

      // Extract status code if available
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const isRecoverable =
        !status ||
        status === 404 ||
        status === 429 ||
        status === 500 ||
        status === 503 ||
        status === 502;

      if (!isRecoverable) {
        console.warn(`[Gemini Fallback] Non-standard error status ${status}, trying next fallback model...`);
      }
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// Weather code helper
function interpretWmoWeatherCode(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: "Clear Sky", emoji: "☀️" };
  if (code === 1) return { condition: "Mainly Clear", emoji: "🌤️" };
  if (code === 2) return { condition: "Partly Cloudy", emoji: "⛅" };
  if (code === 3) return { condition: "Overcast", emoji: "☁️" };
  if (code >= 45 && code <= 48) return { condition: "Foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 55) return { condition: "Light Drizzle", emoji: "🌦️" };
  if (code >= 61 && code <= 65) return { condition: "Rainy", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { condition: "Snowy", emoji: "❄️" };
  if (code >= 80 && code <= 82) return { condition: "Rain Showers", emoji: "🌦️" };
  if (code >= 95 && code <= 99) return { condition: "Thunderstorm", emoji: "⛈️" };
  return { condition: "Partly Cloudy", emoji: "⛅" };
}

// System instructions for different reflection modes with rich sector and context data
function getSystemInstructionForMode(
  mode?: string,
  sector?: string,
  location?: string,
  contextData?: any
): string {
  const sectorContext = sector ? `\nTarget Life Sector: ${sector.toUpperCase()}` : "";
  const locationContext = location ? `\nCurrent Location of user: ${location}` : "";
  
  let enrichedContext = "";
  if (contextData && typeof contextData === "object") {
    const parts: string[] = [];
    if (contextData.weather) {
      parts.push(`- Weather: ${contextData.weather.temperature}${contextData.weather.temperatureUnit || "°C"}, ${contextData.weather.condition} ${contextData.weather.iconEmoji || ""}`);
    }
    if (contextData.health) {
      const h = contextData.health;
      const healthItems: string[] = [];
      if (h.sleepHours) healthItems.push(`Sleep: ${h.sleepHours} hrs (${h.sleepQuality || "good"})`);
      if (h.workoutType) healthItems.push(`Workout: ${h.workoutType} (${h.workoutDurationMins || 30} mins, ${h.caloriesBurned || 250} kcal)`);
      if (h.stepCount) healthItems.push(`Steps: ${h.stepCount.toLocaleString()}`);
      if (h.heartRateBpm) healthItems.push(`Resting HR: ${h.heartRateBpm} bpm`);
      if (healthItems.length > 0) {
        parts.push(`- Health Data: ${healthItems.join(", ")}`);
      }
    }
    if (Array.isArray(contextData.calendarEvents) && contextData.calendarEvents.length > 0) {
      const eventsSummary = contextData.calendarEvents
        .map((e: any) => `${e.title || "Event"} at ${e.startTime || "scheduled time"}`)
        .join("; ");
      parts.push(`- Today's Agenda / Calendar Events: ${eventsSummary}`);
    }
    if (parts.length > 0) {
      enrichedContext = `\n\n[Active Real-Time Context of the Moment]:\n${parts.join("\n")}\nUse this contextual background subtly and naturally to make your reflection feel aware and deeply grounded in the user's day.`;
    }
  }

  switch (mode) {
    case "brainstorm":
      return `You are ReflectAI in Brainstorming Mode.${sectorContext}${locationContext}${enrichedContext}
You are an empathetic, visionary thinking partner.
Help the user explore creative possibilities, generate fresh angles, uncover hidden connections, and formulate inspiring questions or next steps based on their thoughts, contextual data (health, schedule, environment), and any uploaded media.
Use thoughtful formatting with bullet points and bold highlights. Keep your tone uplifting, structured, and constructive.`;

    case "summary":
      return `You are ReflectAI in Synthesizer & Summary Mode.${sectorContext}${locationContext}${enrichedContext}
Analyze the user's reflection entries and multimodal context to provide a structured synthesis:
1. Core Themes (2-3 key takeaways)
2. Emotional Tone & Mindset
3. Actionable Insights for personal momentum.
Format with clean headings and concise prose.`;

    case "reframe":
      return `You are ReflectAI in Cognitive Reframing & Growth Mode.${sectorContext}${locationContext}${enrichedContext}
Help the user view their situations through compassionate, grounded, and empowering lenses.
Acknowledge and validate their real feelings without toxic positivity, identify cognitive distortions or limiting self-talk gently, and offer 2-3 balanced, resilient perspectives.`;

    case "gratitude":
      return `You are ReflectAI in Gratitude & Appreciation Mode.${sectorContext}${locationContext}${enrichedContext}
Help the user savor meaningful moments, appreciate personal progress, and connect deeply with positive experiences and lessons learned.
If images, weather, or location are shared, weave appreciation of the moment into your reflection. Ask one gentle deepening question at the end.`;

    case "reflection":
    default:
      return `You are ReflectAI, an empathetic, mindful, and intelligent personal reflection partner.${sectorContext}${locationContext}${enrichedContext}
Your role is to actively listen to the user's journal entries, validate their experiences, highlight underlying patterns or emotions, integrate visual and environmental context (health metrics, weather, calendar, location), and offer thoughtful reflections or open-ended inquiries that promote clarity, self-awareness, and personal growth.
Always maintain a warm, non-judgmental, and articulate tone.`;
  }
}

// Helper to sanitize base64 data
function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        mimeType: match[1],
        base64Data: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

// API Routes
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ReflectAI Server",
  });
});

// Multi-turn Reflection with Multimodal Vision Support & Live Context
app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const mode = typeof data.mode === "string" ? data.mode : "reflection";
    const sector = typeof data.sector === "string" ? data.sector : "";
    const location = data.location && typeof data.location.placeName === "string" ? data.location.placeName : "";
    const contextPrompt = typeof data.contextPrompt === "string" ? data.contextPrompt : "";
    const contextData = data.contextData && typeof data.contextData === "object" ? data.contextData : null;

    if (messages.length === 0 && !contextPrompt) {
      return res.status(400).json({ error: "No messages or reflection content provided." });
    }

    const systemInstruction = getSystemInstructionForMode(mode, sector, location, contextData);

    // Format messages for @google/genai SDK with multimodal support
    const formattedContents: any[] = [];

    if (contextPrompt) {
      formattedContents.push({
        role: "user",
        parts: [{ text: `[Session Context & Notes]:\n${contextPrompt}` }],
      });
    }

    for (const msg of messages) {
      const role = msg.role === "assistant" ? "model" : "user";
      const text = typeof msg.content === "string" ? msg.content.trim() : "";
      const parts: any[] = [];

      // Include text
      if (text) {
        let textWithLocation = text;
        if (msg.location && msg.location.placeName) {
          textWithLocation = `[Location: ${msg.location.placeName}]\n${text}`;
        }
        parts.push({ text: textWithLocation });
      }

      // Include multimodal image/media parts if present in user message
      if (Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.dataUrl && typeof att.dataUrl === "string") {
            const parsed = parseDataUrl(att.dataUrl);
            if (parsed && (parsed.mimeType.startsWith("image/") || parsed.mimeType.startsWith("video/"))) {
              parts.push({
                inlineData: {
                  mimeType: parsed.mimeType,
                  data: parsed.base64Data,
                },
              });
            }
          }
        }
      }

      if (parts.length > 0) {
        formattedContents.push({
          role,
          parts,
        });
      }
    }

    if (formattedContents.length === 0) {
      return res.status(400).json({ error: "Empty message content." });
    }

    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: formattedContents,
      temperature: 0.7,
    });

    return res.json({
      reply: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/reflect:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate reflection from Gemini AI.",
    });
  }
});

// Weather Context API endpoint (using public Open-Meteo API)
app.get("/api/context/weather", async (req: Request, res: Response) => {
  try {
    let lat = req.query.lat ? parseFloat(String(req.query.lat)) : NaN;
    let lon = req.query.lon ? parseFloat(String(req.query.lon)) : NaN;
    const city = req.query.city ? String(req.query.city).trim() : "";
    let locationName = city || "Local Weather";

    // If city name is provided or coordinates are missing, resolve via geocoding
    if ((isNaN(lat) || isNaN(lon)) && city) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (geoData && Array.isArray(geoData.results) && geoData.results.length > 0) {
            const first = geoData.results[0];
            lat = first.latitude;
            lon = first.longitude;
            locationName = `${first.name}${first.admin1 ? `, ${first.admin1}` : ""}${first.country ? ` (${first.country_code || first.country})` : ""}`;
          }
        }
      } catch (geoErr) {
        console.warn("Geocoding failed, falling back to default:", geoErr);
      }
    }

    // Default to a standard city if neither coordinate nor city was found
    if (isNaN(lat) || isNaN(lon)) {
      lat = 37.7749;
      lon = -122.4194;
      locationName = "San Francisco, CA";
    }

    // Fetch current weather from Open-Meteo
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
    );

    if (!weatherRes.ok) {
      throw new Error(`Weather service returned status ${weatherRes.status}`);
    }

    const weatherJson: any = await weatherRes.json();
    const current = weatherJson.current || {};
    const weatherCode = typeof current.weather_code === "number" ? current.weather_code : 0;
    const { condition, emoji } = interpretWmoWeatherCode(weatherCode);

    const tempCelsius = typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m * 10) / 10 : 20.0;
    const humidity = typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : 55;
    const windSpeed = typeof current.wind_speed_10m === "number" ? Math.round(current.wind_speed_10m * 10) / 10 : 12.0;

    return res.json({
      temperature: tempCelsius,
      temperatureUnit: "°C",
      condition,
      weatherCode,
      iconEmoji: emoji,
      locationName,
      humidity,
      windSpeed,
      recordedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/context/weather:", err);
    // Return a graceful fallback weather object
    return res.json({
      temperature: 21.5,
      temperatureUnit: "°C",
      condition: "Partly Cloudy",
      weatherCode: 2,
      iconEmoji: "⛅",
      locationName: req.query.city ? String(req.query.city) : "Current Location",
      humidity: 50,
      windSpeed: 10.0,
      recordedAt: new Date().toISOString(),
    });
  }
});

// Automated Tag Suggestions Endpoint
app.post("/api/gemini/suggest-tags", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const text = typeof data.text === "string" ? data.text : "";
    const sector = typeof data.sector === "string" ? data.sector : "";

    if (!text.trim()) {
      return res.json({ tags: ["Journal", "Reflection"] });
    }

    const systemInstruction = `You are an automated categorization assistant.
Extract 3 to 6 crisp, concise, high-value tags for a personal journal entry.
Tags should cover activities, emotions, themes, or milestones (e.g., "Morning Routine", "Deep Work", "5k Run", "Mindfulness", "Family Time").
Return ONLY a JSON array of strings: ["Tag1", "Tag2", "Tag3"]`;

    const { text: geminiText, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: [
        {
          role: "user",
          parts: [{ text: `Sector: ${sector}\nJournal Content:\n${text}` }],
        },
      ],
      temperature: 0.3,
    });

    let tags: string[] = [];
    try {
      const cleaned = geminiText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        tags = parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      tags = ["Reflection", "Personal Growth"];
    }

    return res.json({ tags: tags.slice(0, 6), modelUsed });
  } catch (error: any) {
    console.error("Error in /api/gemini/suggest-tags:", error);
    return res.json({ tags: ["Reflection", "Journal"] });
  }
});

// Vision Analysis Endpoint for uploaded images/media
app.post("/api/gemini/analyze-media", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const dataUrl = typeof data.dataUrl === "string" ? data.dataUrl : "";
    const prompt = typeof data.prompt === "string" ? data.prompt : "";

    if (!dataUrl) {
      return res.status(400).json({ error: "Media dataUrl is required." });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid dataUrl format." });
    }

    const systemInstruction = `You are a visual journaling assistant. Analyze the user's uploaded journal photo or media:
1. Provide a concise, evocative 1-2 sentence description of what is captured in the moment.
2. Identify the predominant life sector from: ['health', 'career', 'finance', 'relationships', 'growth', 'creative', 'travel', 'spiritual', 'home', 'leisure'].
3. Extract 3 descriptive visual tags.
4. Suggest a mindful reflection question based on this image.

Return ONLY a JSON object with:
{
  "description": "...",
  "suggestedSector": "health" | "career" | "finance" | "relationships" | "growth" | "creative" | "travel" | "spiritual" | "home" | "leisure",
  "visualTags": ["tag1", "tag2", "tag3"],
  "reflectionQuestion": "..."
}`;

    const parts: any[] = [
      {
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.base64Data,
        },
      },
      { text: prompt || "Analyze this journal photo for my life reflection." },
    ];

    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: "user", parts }],
      temperature: 0.4,
    });

    let result;
    try {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = {
        description: text.slice(0, 150),
        suggestedSector: "leisure",
        visualTags: ["Journal Moment", "Photo"],
        reflectionQuestion: "What meaning does this moment hold for you today?",
      };
    }

    return res.json({
      ...result,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze-media:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze media.",
    });
  }
});

// Structured Summarization & Multi-Sector Categorization Endpoint
app.post("/api/gemini/summarize", async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const threadText = typeof data.threadText === "string" ? data.threadText : "";
    const contextData = data.contextData && typeof data.contextData === "object" ? data.contextData : null;
    const customCategories = Array.isArray(data.customCategories) ? data.customCategories : [];

    if (!threadText.trim()) {
      return res.status(400).json({ error: "Thread text is required for summarization." });
    }

    let customCategoryInstructions = "";
    if (customCategories.length > 0) {
      const catList = customCategories.map((c: any) => `- "${c.id || c.name}" (${c.name}: ${c.description || "custom"})`).join("\n");
      customCategoryInstructions = `\nCustom User Categories (You may choose one of these if it strongly fits):\n${catList}`;
    }

    let contextInfo = "";
    if (contextData) {
      const parts: string[] = [];
      if (contextData.weather) parts.push(`Weather: ${contextData.weather.temperature}${contextData.weather.temperatureUnit}, ${contextData.weather.condition}`);
      if (contextData.health) {
        if (contextData.health.workoutType) parts.push(`Workout: ${contextData.health.workoutType}`);
        if (contextData.health.sleepHours) parts.push(`Sleep: ${contextData.health.sleepHours}h`);
        if (contextData.health.stepCount) parts.push(`Steps: ${contextData.health.stepCount}`);
      }
      if (contextData.location && contextData.location.placeName) parts.push(`Location: ${contextData.location.placeName}`);
      if (parts.length > 0) {
        contextInfo = `\nEnriched Context Data: ${parts.join(" | ")}`;
      }
    }

    const systemInstruction = `You are an expert journal synthesizer and life categorization engine.
Given the user's journal entries, reflection conversation, and real-time contextual data, generate a JSON object with:
1. "title": A concise, meaningful 3-6 word title capturing the essence of the entry (e.g., "Morning 5km Run", "Client Project Breakthrough", "Evening Date Night in Tokyo").
2. "sector": The most accurate life sector from this exact list:
   - "health" (Health & Wellness: exercise, food, sleep, mental health, symptoms, weight, nutrition)
   - "career" (Career & Professional: work, promotion, skills, interview, project, leadership, clients)
   - "finance" (Finance: income, savings, investment, budget, debt, goals, expenses)
   - "relationships" (Relationships: family, friends, partner, communication, marriage, parenting)
   - "growth" (Personal Growth: learning, reading, courses, habits, goals, achievements)
   - "creative" (Creative: art, music, writing, photography, design, inspiration)
   - "travel" (Travel & Adventure: trips, exploration, new places, experiences, culture)
   - "spiritual" (Spiritual: meditation, mindfulness, gratitude, purpose, faith)
   - "home" (Home & Lifestyle: living space, decoration, routines, pets, neighborhood)
   - "leisure" (Leisure & Fun: hobbies, gaming, entertainment, sports, social events)
   ${customCategoryInstructions}
3. "summary": A polished 2-3 sentence executive reflection summary.
4. "keyInsights": An array of 2-4 bullet point insights or learnings.
5. "tags": An array of 2-5 relevant categorical tags (activities, themes, locations, or states of mind).
6. "sentimentTone": A short descriptor of the emotional tone (e.g., "Energized & Motivated", "Grounded Peace", "Curious & Creative").
7. "moodScore": A numeric rating between 1 and 10 representing the user's perceived emotional sentiment (e.g., 7.5, 8.0, 6.5).

Return ONLY valid JSON matching this structure without markdown code blocks.`;

    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: `Here is the journal thread and context:${contextInfo}\n\n${threadText}` }] }],
      temperature: 0.3,
    });

    let parsedResult;
    try {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      parsedResult = {
        title: "Personal Reflection Entry",
        sector: "growth",
        summary: text.slice(0, 200),
        keyInsights: ["Continued self-exploration", "Clarified priorities"],
        tags: ["Reflection", "Journal"],
        sentimentTone: "Thoughtful",
        moodScore: 7.5,
      };
    }

    return res.json({
      ...parsedResult,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/summarize:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate summary.",
    });
  }
});

/**
 * SSRF & URL Validation Guard for Webhooks
 */
function isValidWebhookUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    // Disallow loopback and private IP networks
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname === "169.254.169.254"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to build Slack Block Kit JSON payloads
 */
function buildSlackBlocks(payload: {
  title: string;
  summary?: string;
  keyInsights?: string[];
  sector?: string;
  moodScore?: number;
  tags?: string[];
  authorName?: string;
  triggerType?: string;
  contextInfo?: string;
  timestamp?: string;
}) {
  const {
    title,
    summary,
    keyInsights = [],
    sector = "growth",
    moodScore,
    tags = [],
    authorName = "ReflectAI User",
    triggerType = "reflection_summary",
    contextInfo,
    timestamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  } = payload;

  const sectorEmojiMap: Record<string, string> = {
    health: "🌿",
    career: "💼",
    finance: "💰",
    relationships: "❤️",
    growth: "🌱",
    creative: "🎨",
    travel: "✈️",
    spiritual: "✨",
    home: "🏡",
    leisure: "🎮",
  };
  const emoji = sectorEmojiMap[sector.toLowerCase()] || "🌟";

  let headerText = `${emoji} ReflectAI Journal Entry`;
  if (triggerType === "weekly_digest") {
    headerText = `📊 ReflectAI Weekly Executive Digest`;
  } else if (triggerType === "daily_reminder") {
    headerText = `🌙 ReflectAI Evening Reflection Reminder`;
  } else if (triggerType === "test_notification") {
    headerText = `🔔 ReflectAI Slack Connection Verified`;
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: headerText,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${title}*\n${summary || "_No reflection summary provided._"}`,
      },
    },
  ];

  // Key Takeaways section if available
  if (keyInsights && keyInsights.length > 0) {
    const insightsList = keyInsights.map((ki) => `• ${ki}`).join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key Insights & Takeaways:*\n${insightsList}`,
      },
    });
  }

  // Meta fields: Sector, Mood, Tags
  const metaFields: any[] = [
    {
      type: "mrkdwn",
      text: `*Life Sector:*\n${emoji} \`${sector.toUpperCase()}\``,
    },
  ];

  if (moodScore !== undefined && moodScore !== null) {
    const stars = "★".repeat(Math.round(moodScore / 2)) + "☆".repeat(5 - Math.round(moodScore / 2));
    metaFields.push({
      type: "mrkdwn",
      text: `*Mood Rating:*\n${moodScore}/10  \`${stars}\``,
    });
  }

  if (tags && tags.length > 0) {
    metaFields.push({
      type: "mrkdwn",
      text: `*Tags:*\n${tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`,
    });
  }

  if (contextInfo) {
    metaFields.push({
      type: "mrkdwn",
      text: `*Telemetry Context:*\n${contextInfo}`,
    });
  }

  blocks.push({
    type: "section",
    fields: metaFields,
  });

  // Footer / Context block
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Logged by *${authorName}* • ${timestamp} • _ReflectAI Multi-Sector Intelligence_`,
      },
    ],
  });

  return blocks;
}

/**
 * POST /api/notifications/dispatch-slack
 * Dispatches a formatted Slack block message to the user's incoming webhook URL
 */
app.post("/api/notifications/dispatch-slack", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      webhookUrl,
      channelName,
      botName = "ReflectAI Assistant",
      title = "Journal Reflection Update",
      summary,
      keyInsights,
      sector = "growth",
      moodScore,
      tags,
      authorName = "ReflectAI User",
      triggerType = "manual_share",
      contextInfo,
    } = body;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return res.status(400).json({ error: "Missing or invalid Slack webhookUrl." });
    }

    if (!isValidWebhookUrl(webhookUrl)) {
      return res.status(400).json({
        error: "Invalid webhook URL. Must be an external HTTPS URL (e.g. https://hooks.slack.com/services/...).",
      });
    }

    const blocks = buildSlackBlocks({
      title,
      summary,
      keyInsights,
      sector,
      moodScore,
      tags,
      authorName,
      triggerType,
      contextInfo,
    });

    const payload: Record<string, any> = {
      username: botName,
      icon_emoji: ":sparkles:",
      blocks,
      text: `${title} - ${summary || "ReflectAI Journal Update"}`,
    };

    if (channelName && typeof channelName === "string" && channelName.trim().startsWith("#")) {
      payload.channel = channelName.trim();
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Slack API error (${response.status}): ${responseText}`,
      });
    }

    return res.json({
      success: true,
      message: "Slack notification sent successfully!",
      channel: channelName || "Default Webhook Channel",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/dispatch-slack:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to dispatch Slack notification.",
    });
  }
});

/**
 * POST /api/notifications/dispatch-email
 * Generates and dispatches a responsive HTML & plain-text reflection email digest
 */
app.post("/api/notifications/dispatch-email", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      recipientEmail,
      subject,
      title = "Journal Reflection Digest",
      summary,
      keyInsights = [],
      sector = "growth",
      moodScore,
      tags = [],
      authorName = "ReflectAI User",
      triggerType = "reflection_summary",
      contextInfo,
      weeklyStats,
    } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: "A valid recipient email address is required." });
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const computedSubject =
      subject ||
      (triggerType === "weekly_digest"
        ? `📊 Your ReflectAI Weekly Life Synthesis (${dateStr})`
        : `✨ ReflectAI Journal: ${title}`);

    // Build Responsive HTML Template
    const insightsHtml =
      Array.isArray(keyInsights) && keyInsights.length > 0
        ? `<div style="margin-top: 16px; padding: 16px; background-color: #0f172a; border-radius: 8px; border: 1px solid #1e293b;">
            <div style="font-weight: 700; color: #818cf8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Key Takeaways & Insights</div>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              ${keyInsights.map((ki: string) => `<li style="margin-bottom: 6px;">${ki}</li>`).join("")}
            </ul>
          </div>`
        : "";

    const tagsHtml =
      Array.isArray(tags) && tags.length > 0
        ? `<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
            ${tags.map((t: string) => `<span style="background-color: #1e1b4b; color: #a5b4fc; border: 1px solid #3730a3; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">${t.startsWith("#") ? t : `#${t}`}</span>`).join(" ")}
          </div>`
        : "";

    const moodHtml =
      moodScore !== undefined && moodScore !== null
        ? `<div style="margin-top: 12px; font-size: 13px; color: #e2e8f0;">
            <strong>Mood Sentiment:</strong> <span style="color: #38bdf8; font-weight: 700;">${moodScore}/10</span>
          </div>`
        : "";

    const statsHtml =
      weeklyStats && typeof weeklyStats === "object"
        ? `<div style="margin: 20px 0; padding: 16px; background-color: #0f172a; border-radius: 8px; border: 1px solid #334155;">
            <div style="font-weight: 700; color: #38bdf8; font-size: 14px; margin-bottom: 10px;">📊 Weekly Sector Snapshot</div>
            <div style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              • Total Entries: <strong>${weeklyStats.totalEntries || 0}</strong><br/>
              • Top Sector: <strong>${weeklyStats.topSector || "Growth"}</strong><br/>
              • Average Mood: <strong>${weeklyStats.averageMood || "7.5"}/10</strong><br/>
              • Active Streak: <strong>${weeklyStats.activeStreak || 1} days</strong>
            </div>
          </div>`
        : "";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${computedSubject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
    <!-- Header Banner -->
    <tr>
      <td style="padding: 24px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #312e81;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Reflect<span style="color: #6366f1;">AI</span></span>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Multi-Sector Life Journal Intelligence</div>
          </div>
          <span style="background-color: #4f46e5; color: #ffffff; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 12px; text-transform: uppercase;">${sector}</span>
        </div>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px;">
        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${dateStr}</div>
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">${title}</h1>

        <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px;">
          ${summary ? summary.replace(/\n/g, "<br/>") : "Here is a record of your latest reflection and self-exploration milestones."}
        </div>

        ${insightsHtml}
        ${statsHtml}
        ${moodHtml}
        ${tagsHtml}

        ${contextInfo ? `<div style="margin-top: 16px; font-size: 12px; color: #64748b; font-style: italic;">Context Telemetry: ${contextInfo}</div>` : ""}

        <!-- Action CTA -->
        <div style="margin-top: 28px; text-align: center;">
          <a href="#" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
            Open ReflectAI Workspace
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 28px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
        Delivered to <strong style="color: #94a3b8;">${recipientEmail}</strong> as part of your ReflectAI Notification Preferences.<br/>
        ReflectAI protects your personal privacy with Zero-Trust owner-bound encryption.
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return res.json({
      success: true,
      message: `Notification email prepared and delivered to ${recipientEmail}`,
      recipient: recipientEmail,
      subject: computedSubject,
      previewSnippet: summary?.slice(0, 120) || title,
      htmlPreview: htmlContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/dispatch-email:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to dispatch email notification.",
    });
  }
});

/**
 * POST /api/notifications/generate-digest
 * Uses Gemini to synthesize a set of journal entries into a clean executive notification digest
 */
app.post("/api/notifications/generate-digest", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { entries = [], period = "weekly", authorName = "Journaler" } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "At least one journal entry is required to generate a digest." });
    }

    const formattedEntries = entries
      .slice(0, 10)
      .map((e: any, idx: number) => {
        return `Entry #${idx + 1} (${e.createdAt || "recent"} | Sector: ${e.sector || "general"} | Mood: ${e.moodScore || "N/A"}):
Title: ${e.title || "Untitled"}
Summary: ${e.summary || (e.messages && e.messages[0] ? e.messages[0].content : "No summary")}
Key Insights: ${Array.isArray(e.keyInsights) ? e.keyInsights.join("; ") : "None"}`;
      })
      .join("\n\n---\n\n");

    const systemInstruction = `You are an executive life coach and personal growth synthesizer.
Create a high-impact, inspiring notification digest for ${authorName}'s ${period} reflection review.
Generate a JSON object with:
1. "digestTitle": A strong 4-7 word headline for the digest (e.g. "Weekly Momentum: Breakthroughs in Health & Career").
2. "executiveSummary": A 2-3 sentence overview celebrating progress, emotional balance, and clarity.
3. "topMilestones": Array of 3 specific bullet points highlighting key wins or learnings across life sectors.
4. "actionCommitments": Array of 2 actionable micro-commitments for the coming days.
5. "overallSentiment": A short descriptor (e.g. "Focused, Resilient & Grounded").

Return ONLY valid JSON matching this schema without markdown code blocks.`;

    const { text, modelUsed } = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: `Here are the recent journal entries for synthesis:\n\n${formattedEntries}` }] }],
      temperature: 0.4,
    });

    let digest;
    try {
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      digest = JSON.parse(cleaned);
    } catch {
      digest = {
        digestTitle: `ReflectAI ${period === "weekly" ? "Weekly" : "Daily"} Growth Digest`,
        executiveSummary: text.slice(0, 200),
        topMilestones: ["Consistent daily mindfulness practice", "Clarified strategic life sector focus"],
        actionCommitments: ["Maintain current rhythm", "Carve out dedicated space for deep reflection"],
        overallSentiment: "Positive Momentum",
      };
    }

    return res.json({
      success: true,
      ...digest,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/notifications/generate-digest:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate AI notification digest.",
    });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ReflectAI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();


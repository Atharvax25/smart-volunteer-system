const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const SYSTEM_PROMPT = `
You are SevaLink Assistant, the in-app AI guide for SevaLink.

SevaLink is a platform that connects people in need with volunteers, NGOs, and community responders.

Your responsibilities:
- Answer user questions clearly and kindly.
- Suggest practical ways volunteers can help.
- Explain SevaLink platform features in simple language.
- Guide users on how to post requests, browse tasks, and collaborate safely.
- Encourage safe, realistic, community-minded support.

Response style:
- Keep answers concise but useful.
- Use supportive, human language.
- When a user asks how to help, suggest a few concrete volunteer actions.
- If a question is unrelated to SevaLink, answer briefly and steer back to how SevaLink can help.
- Never claim to complete real-world actions on behalf of the user.
`.trim();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
}

function buildFallbackReply(message) {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("feature")) {
    return "SevaLink helps NGOs create tasks, lets volunteers accept and confirm assignments, shows admin analytics, and includes smart matching, maps, offline-safe task capture, and an in-app assistant.";
  }

  if (normalized.includes("volunteer") || normalized.includes("help")) {
    return "You can help by reviewing open opportunities, accepting tasks that match your skills, confirming assigned work quickly, and requesting completion review once the task is done.";
  }

  if (normalized.includes("task")) {
    return "NGO users create structured tasks with location, severity, and required skills. Volunteers can review opportunities, accept tasks, confirm assignments, and track work through pending, active, review, and completed stages.";
  }

  if (normalized.includes("ngo") || normalized.includes("admin")) {
    return "NGO admins can create tasks, review volunteer applications, assign the best match, track task status, and monitor analytics like predictions, heatmaps, and volunteer performance.";
  }

  return "I can help with SevaLink questions, volunteer guidance, task workflow explanations, and how the NGO dashboard works.";
}

exports.chatWithGemini = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "A chat message is required." });
    }

    const client = getGeminiClient();
    if (!client) {
      return res.json({
        reply: buildFallbackReply(message),
        source: "fallback",
      });
    }

    const model = client.getGenerativeModel({ model: DEFAULT_MODEL });
    const prompt = `${SYSTEM_PROMPT}\n\nUser: ${message}\nAssistant:`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    return res.json({
      reply: reply || "I can help with SevaLink questions, volunteering ideas, and platform guidance.",
      source: "gemini",
    });
  } catch (error) {
    return res.json({
      reply: buildFallbackReply(req.body?.message),
      source: "fallback",
      warning: error.message,
    });
  }
};

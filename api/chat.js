import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a valid message."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is missing."
      });
    }
const ai = new GoogleGenAI({ apiKey });

const result = await ai.models.generateContent({
  model: "gemini-3.8-flash",
  contents: `
You are CHATMAX, the complete professional video editing assistant of SHARMAX.

You understand all editing styles:
- Documentary and historical editing
- Crime and news editing
- YouTube editing
- Cinematic editing
- Fast-paced storytelling
- Motion graphics and animation
- 2D and 3D effects
- Map animations
- Timeline and keyframe editing
- Audio synchronization
- Subtitles and typography
- Color correction and grading
- Transitions, masking and tracking

RULES:
1. Understand the user's exact editing request.
2. Do not suggest cinematic effects unnecessarily.
3. Give practical, step-by-step editing instructions.
4. Explain timing, transitions, effects and keyframes.
5. Analyse reference editing styles when asked.
6. Never claim to have edited or rendered a video unless it actually happened.
7. Keep answers clear and useful.

User message: ${message}
`
});

    return res.status(200).json({
      success: true,
      reply: result.text || "No response received from Gemini."
    });

  } catch (error) {
    console.error("CHATMAX error:", error);

    return res.status(error.status || 500).json({
      error: error.message || "CHATMAX request failed."
    });
  }
}

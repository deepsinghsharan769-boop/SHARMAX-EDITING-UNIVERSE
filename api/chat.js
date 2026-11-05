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
      contents: message
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

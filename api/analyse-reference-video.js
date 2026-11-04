import { get } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { pathname } = req.body || {};

    if (!pathname) {
      return res.status(400).json({
        error: "Video pathname is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is missing."
      });
    }

    const video = await get(pathname, {
      access: "private"
    });

    if (!video || !video.stream) {
      return res.status(404).json({
        error: "Reference video not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reference video found. Ready for Gemini analysis.",
      pathname: video.blob.pathname,
      contentType: video.blob.contentType,
      size: video.blob.size
    });

  } catch (error) {
    console.error("Reference analysis error:", error);

    return res.status(500).json({
      error: error.message || "Analysis setup failed."
    });
  }
}

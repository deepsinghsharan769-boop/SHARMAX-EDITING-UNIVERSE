export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, mimeType, size } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key missing" });
    }

    if (
      !fileName ||
      !mimeType ||
      !mimeType.startsWith("video/") ||
      !Number.isFinite(size) ||
      size <= 0
    ) {
      return res.status(400).json({ error: "Invalid video details" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(size),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: { display_name: fileName }
        })
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Could not start video upload"
      });
    }

    const uploadUrl = response.headers.get("x-goog-upload-url");

    if (!uploadUrl) {
      return res.status(500).json({
        error: "Upload session URL not received"
      });
    }

    return res.status(200).json({ uploadUrl });

  } catch (error) {
    return res.status(500).json({
      error: "Upload setup failed"
    });
  }
}

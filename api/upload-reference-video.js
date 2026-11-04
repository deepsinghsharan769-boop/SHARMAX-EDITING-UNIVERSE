export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const mimeType = req.headers["content-type"];
    const fileName = req.headers["x-file-name"] || "reference-video";

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key missing." });
    }

    if (!mimeType?.startsWith("video/")) {
      return res.status(400).json({ error: "Please upload a video." });
    }

    const chunks = [];
    let totalSize = 0;

    for await (const chunk of req) {
      totalSize += chunk.length;

      if (totalSize > 4 * 1024 * 1024) {
        return res.status(413).json({
          error: "Video must be smaller than 4 MB."
        });
      }

      chunks.push(chunk);
    }

    const videoBuffer = Buffer.concat(chunks);

    if (!videoBuffer.length) {
      return res.status(400).json({ error: "Video is empty." });
    }

    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(totalSize),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: { display_name: fileName }
        })
      }
    );

    if (!startResponse.ok) {
      return res.status(502).json({
        error: "Could not create Gemini upload session."
      });
    }

    const uploadUrl = startResponse.headers.get("x-goog-upload-url");

    if (!uploadUrl) {
      return res.status(502).json({
        error: "Gemini upload URL was not received."
      });
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        "Content-Type": mimeType
      },
      body: videoBuffer
    });

    const resultText = await uploadResponse.text();

    let result = {};
    try {
      result = JSON.parse(resultText);
    } catch {}

    if (!uploadResponse.ok) {
      return res.status(502).json({
        error: "Gemini video upload failed."
      });
    }

    return res.status(200).json({
      success: true,
      file: result.file || result
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server upload failed."
    });
  }
}

import { get } from "@vercel/blob";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import os from "os";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  let tempFile;

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

    const mimeType = video.blob.contentType;

    if (!mimeType?.startsWith("video/")) {
      return res.status(400).json({
        error: "Uploaded file is not a video."
      });
    }

    if (video.blob.size > 100 * 1024 * 1024) {
      return res.status(400).json({
        error: "Video must be 100 MB or smaller for Gemini analysis."
      });
    }

    const buffer = Buffer.from(
      await new Response(video.stream).arrayBuffer()
    );

    tempFile = path.join(
      os.tmpdir(),
      `sharmax-${Date.now()}.video`
    );

    await fs.writeFile(tempFile, buffer);

    const ai = new GoogleGenAI({ apiKey });

    const uploadedFile = await ai.files.upload({
      file: tempFile,
      config: {
        mimeType,
        displayName: "SHARMAX Reference Video"
      }
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType) {
      throw new Error("Gemini video upload failed.");
    }

    let fileStatus = uploadedFile;

    for (let i = 0; i < 30; i++) {
      if (fileStatus.state === "ACTIVE") break;

      if (fileStatus.state === "FAILED") {
        throw new Error("Gemini could not process this video.");
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      fileStatus = await ai.files.get({
        name: uploadedFile.name
      });
    }

    if (fileStatus.state !== "ACTIVE") {
      throw new Error("Video processing is taking too long.");
    }

    const result = await ai.models.generateContent({
     model: "gemini-3.8-flash",
      contents: [
        {
          fileData: {
            fileUri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType
          }
        },
        {
          text: `
Analyse this reference video for SHARMAX.

Identify its editing style, including:

1. Camera movements
2. Zoom in and zoom out
3. Pan and tilt
4. Parallax and depth effects
5. Transitions
6. Motion graphics
7. Blur and lighting
8. Text animations
9. Scene timing
10. Overall visual style

Return structured JSON with:
- overallStyle
- scenes
- cameraMovements
- transitions
- motionGraphics
- effects
- timing
- recommendations

For each scene, estimate its duration and describe
the visible editing technique.

This video is a style reference.
Do not suggest copying its entire content.
`
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: "Gemini AI analysis completed!",
      analysis: result.text
    });

  } catch (error) {
    console.error("Gemini analysis error:", error);

    return res.status(500).json({
      error: error.message || "Gemini analysis failed."
    });

  } finally {
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }
  }
}

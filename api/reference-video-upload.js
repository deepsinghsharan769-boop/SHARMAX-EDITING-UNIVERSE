import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,

      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-matroska"
          ],
          maximumSizeInBytes: 150 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            purpose: "reference-video"
          })
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log("Reference video uploaded:", blob.pathname);
      }
    });

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("Reference upload error:", error);

    return res.status(400).json({
      error: error.message || "Upload authorization failed."
    });
  }
}

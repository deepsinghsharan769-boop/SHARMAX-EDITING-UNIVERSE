export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 10000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured"
      });
    }

    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite"
    ];

    let lastError = "AI request failed";

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: message }]
                  }
                ]
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            const reply =
              data.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("") || "No response received.";

            return res.status(200).json({
              reply,
              model
            });
          }

          lastError = data.error?.message || "Gemini request failed";

          if (
            response.status !== 429 &&
            response.status !== 500 &&
            response.status !== 503
          ) {
            return res.status(response.status).json({
              error: lastError
            });
          }

        } catch (error) {
          lastError = error.message;
        }

        await new Promise(resolve =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }

    return res.status(503).json({
      error: "Both AI models are temporarily unavailable. Please try again later.",
      details: lastError
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}

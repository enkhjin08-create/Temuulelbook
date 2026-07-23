// netlify/functions/generate-pattern.js
//
// Admin-only. Номоо нээнгүүт харагдах чимэглэлийн хээний (endpaper) зургийг
// зурна. Захиалагчийн зураг шаардахгүй — зөвхөн текст prompt-оос шууд зурна.
//
// Хүлээн авах (POST JSON):
//   { storyTitle, interests, gender, patternDescription }
//
// Буцаах (200 JSON): { imageBase64 }
// Header: x-admin-pin

const { buildPatternPrompt } = require("./stories");
const { checkAdminPin } = require("./_admin-auth");

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent";

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const { storyTitle, interests, gender, patternDescription } = body;

  if (!patternDescription || typeof patternDescription !== "string") {
    return respond(400, { error: "Хээний тайлбар дутуу байна." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return respond(500, { error: "Серверт GEMINI_API_KEY тохируулаагүй байна." });
  }

  const prompt = buildPatternPrompt({
    storyTitle: storyTitle || "",
    interests: interests || "",
    gender: gender || "охин",
    patternDescription,
  });

  try {
    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "4:3",
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return respond(502, {
        error: "Gemini API алдаа буцаалаа.",
        detail: `(${geminiRes.status}) ${errText.slice(0, 500)}`,
      });
    }

    const response = await geminiRes.json();
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      return respond(502, {
        error: "Gemini зураг буцаасангүй.",
        detail: textPart ? textPart.text : "Хариу хоосон байна.",
      });
    }

    const outMime = imagePart.inlineData.mimeType || "image/png";
    const outData = imagePart.inlineData.data;

    return respond(200, { imageBase64: `data:${outMime};base64,${outData}` });
  } catch (err) {
    console.error("Pattern generation error:", err);
    return respond(500, {
      error: "Хээ үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
      detail: String(err && err.message ? err.message : err),
    });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

// netlify/functions/generate-character.js
//
// Хүлээн авах (POST JSON):
//   {
//     childName: string,
//     photoBase64: string,   // "data:image/jpeg;base64,...." эсвэл цэвэр base64
//     storyId: string        // stories.js доторх id, өгөгдөөгүй бол анхны түүхийг ашиглана
//   }
//
// Буцаах (200 JSON):
//   { imageBase64: "data:image/png;base64,...." }
//
// Орчны хувьсагч:
//   GEMINI_API_KEY  — Netlify site settings > Environment variables дотор тохируулна

const { GoogleGenAI } = require("@google/genai");
const { STORIES, DEFAULT_STORY_ID } = require("./stories");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const { childName, photoBase64, storyId } = body;

  if (!childName || typeof childName !== "string") {
    return respond(400, { error: "Хүүхдийн нэрийг оруулна уу." });
  }
  if (!photoBase64 || typeof photoBase64 !== "string") {
    return respond(400, { error: "Зураг илгээгдээгүй байна." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return respond(500, {
      error: "Серверт GEMINI_API_KEY тохируулаагүй байна. Netlify Environment variables-с тохируулна уу.",
    });
  }

  const story = STORIES[storyId] || STORIES[DEFAULT_STORY_ID];

  // "data:image/jpeg;base64,XXXX" гэсэн prefix-ийг салгах
  const match = photoBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const rawBase64 = match ? match[2] : photoBase64;

  const prompt = story.buildPrompt(childName);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: rawBase64 } },
          ],
        },
      ],
    });

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

    return respond(200, {
      imageBase64: `data:${outMime};base64,${outData}`,
      storyId: story.id,
    });
  } catch (err) {
    console.error("Gemini generation error:", err);
    return respond(500, {
      error: "Зураг үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
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

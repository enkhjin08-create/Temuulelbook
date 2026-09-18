// netlify/functions/generate-background.js
//
// Admin-only. Номын дотор текстний ард тавих зөөлөн дэвсгэр зургийг зурна.
// Захиалагчийн зураг шаардахгүй — зөвхөн текст prompt-оос шууд зурна.
//
// Хүлээн авах (POST JSON):
//   { storyTitle, interests, gender, backgroundDescription, requestId }
//
// Буцаах (200 JSON): { imageBase64 }
// Header: x-admin-pin

const { buildBackgroundPrompt } = require("./stories");
const { checkAdminPin } = require("./_admin-auth");
const { claimOrWaitForRequest, markDone, markError } = require("./_idempotency");

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

  const { storyTitle, interests, gender, backgroundDescription, requestId } = body;

  if (!backgroundDescription || typeof backgroundDescription !== "string") {
    return respond(400, { error: "Дэвсгэрийн тайлбар дутуу байна." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return respond(500, { error: "Серверт GEMINI_API_KEY тохируулаагүй байна." });
  }

  const idem = await claimOrWaitForRequest(requestId);
  if (!idem.proceed) {
    return respond(200, idem.cached);
  }

  const prompt = buildBackgroundPrompt({
    storyTitle: storyTitle || "",
    interests: interests || "",
    gender: gender || "охин",
    backgroundDescription,
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
            aspectRatio: "1:1",
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      await markError(requestId);
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
      await markError(requestId);
      return respond(502, {
        error: "Gemini зураг буцаасангүй.",
        detail: textPart ? textPart.text : "Хариу хоосон байна.",
      });
    }

    const outMime = imagePart.inlineData.mimeType || "image/png";
    const outData = imagePart.inlineData.data;

    const result = { imageBase64: `data:${outMime};base64,${outData}` };
    await markDone(requestId, result);

    return respond(200, result);
  } catch (err) {
    console.error("Background generation error:", err);
    await markError(requestId);
    return respond(500, {
      error: "Дэвсгэр зураг үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
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

// netlify/functions/enhance-page-image.js
//
// ADMIN-only. Захиалагчийн өөр газар (жишээ нь Gemini апп) гаргасан бэлэн
// зургийг номын чанарт (2K, 1:1) хүргэж сайжруулна: ижил зохиомж, ижил царай,
// watermark / интерфэйсийн үлдэгдэл байвал арилгана.
//
// Хүлээн авах (POST JSON, x-admin-pin): { imageBase64 }  (data URL эсвэл raw base64)
// Буцаах (200 JSON): { imageBase64: "data:image/jpeg;base64,..." }

const { checkAdminPin } = require("./_admin-auth");
const { compressToJpeg } = require("./_image-compress");

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent";

const PROMPT = `You are given a finished children's picture-book illustration. Re-render it as a clean, sharp, print-quality version of THE SAME picture.

STRICT RULES:
- Keep the composition, camera angle, pose, character identity, face, hairstyle, clothing, colors, props and background EXACTLY as in the input. Do not add, remove or redesign anything.
- Keep the same art style (do not make it more realistic or change the style).
- Increase sharpness and fine detail, remove compression artifacts, noise and blur, fix smudged or distorted areas (hands, eyes, edges) without changing what they are.
- Remove any watermark, logo, sparkle badge, UI element or text overlay if present, filling the area naturally.
- Do NOT add any text, letters, captions or borders.
- Output a single square (1:1) image filling the whole canvas.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });

  const auth = checkAdminPin(event);
  if (!auth.ok) return respond(auth.statusCode, { error: auth.error });

  if (!process.env.GEMINI_API_KEY) {
    return respond(500, { error: "Серверт GEMINI_API_KEY тохируулаагүй байна." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const { imageBase64 } = body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return respond(400, { error: "Зураг илгээгдээгүй байна." });
  }

  const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const rawBase64 = match ? match[2] : imageBase64;

  try {
    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: { mimeType, data: rawBase64 } }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return respond(502, { error: "Gemini API алдаа буцаалаа.", detail: `(${geminiRes.status}) ${errText.slice(0, 500)}` });
    }

    const data = await geminiRes.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      return respond(502, { error: "Gemini зураг буцаасангүй.", detail: textPart ? textPart.text : "Хариу хоосон байна." });
    }

    const { mimeType: outMime, data: outData } = await compressToJpeg(
      imagePart.inlineData.mimeType || "image/png",
      imagePart.inlineData.data
    );
    return respond(200, { imageBase64: `data:${outMime};base64,${outData}` });
  } catch (err) {
    console.error("enhance-page-image error:", err);
    return respond(500, { error: "Зураг сайжруулахад алдаа гарлаа.", detail: String(err && err.message ? err.message : err) });
  }
};

function respond(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

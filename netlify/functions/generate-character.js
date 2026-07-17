// netlify/functions/generate-character.js
//
// ЭНГИЙН синхрон function. Personal/Pro план дээр function-ийн синхрон
// хугацааны хязгаар 26 секунд байдаг тул, Gemini-ийн ердийн 15-25 секундийн
// хариу ихэнх тохиолдолд багтана.
//
// Хүлээн авах (POST JSON):
//   { childName, photoBase64, pageIndex, totalPages, sceneDescription }
//   - photoBase64: 0-р хуудсанд захиалагчийн бодит зураг, 1+ хуудсанд өмнөх
//     generate хийсэн зураг (client талаас дамжуулна)
//   - sceneDescription: generate-story.js-ээс ирсэн тухайн хуудасны тайлбар
//
// Буцаах (200 JSON):
//   { imageBase64: "data:image/png;base64,....", pageIndex, isLastPage }

const { buildPagePrompt } = require("./stories");
const { getStore } = require("@netlify/blobs");

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

function getGalleryStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-gallery", siteID, token });
  }
  return getStore("pixietale-gallery");
}

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

  const { childName, photoBase64, sceneDescription, gender } = body;
  const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : 0;
  const totalPages = Number.isInteger(body.totalPages) ? body.totalPages : 1;

  if (!childName || typeof childName !== "string") {
    return respond(400, { error: "Хүүхдийн нэрийг оруулна уу." });
  }
  if (!photoBase64 || typeof photoBase64 !== "string") {
    return respond(400, { error: "Зураг илгээгдээгүй байна." });
  }
  if (!sceneDescription || typeof sceneDescription !== "string") {
    return respond(400, { error: "Хуудасны тайлбар (sceneDescription) дутуу байна." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return respond(500, { error: "Серверт GEMINI_API_KEY тохируулаагүй байна." });
  }

  const isLastPage = pageIndex >= totalPages - 1;

  const match = photoBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const rawBase64 = match ? match[2] : photoBase64;

  const prompt = buildPagePrompt({ childName, gender, sceneDescription, pageIndex, totalPages });

  try {
    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: rawBase64 } },
            ],
          },
        ],
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

    // Generate хийсэн зургийг gallery-д хадгална (алдаа гарвал ч гол хариуг
    // тасалдуулахгүй — зөвхөн log-д бичээд өнгөрнө)
    try {
      const galleryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const galleryStore = getGalleryStore();
      await galleryStore.set(galleryId, outData, {
        metadata: {
          childName,
          pageIndex,
          totalPages,
          mimeType: outMime,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (galleryErr) {
      console.error("Gallery save failed:", galleryErr);
    }

    return respond(200, {
      imageBase64: `data:${outMime};base64,${outData}`,
      pageIndex,
      isLastPage,
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

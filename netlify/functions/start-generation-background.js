// netlify/functions/start-generation-background.js
//
// Энэ бол "background function" (файлын нэрэнд -background гэдэг байдгаараа
// онцлогтой). Netlify үүнийг дуудахад шууд 202 хариу буцаагаад, функц өөрөө
// дэвсгэр дээр (background) үргэлжлүүлж ажилладаг тул 10 секундын хугацааны
// хязгаарт хамаарахгүй, 15 минут хүртэл ажиллаж чадна. Gemini-с зураг гарган
// дуустал хүлээгээд, үр дүнг Netlify Blobs дотор jobId-ээр хадгална.
//
// Хүлээн авах (POST JSON):
//   { jobId, childName, photoBase64, storyId }
//
// Шууд хариу буцаахгүй тул client нь check-generation.js-ээр jobId ашиглан
// тогтмол асууж (poll) байх ёстой.

const { getStore } = require("@netlify/blobs");
const { GoogleGenAI } = require("@google/genai");
const { STORIES, DEFAULT_STORY_ID } = require("./stories");

function getJobsStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-jobs", siteID, token });
  }
  return getStore("pixietale-jobs");
}

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { jobId, childName, photoBase64, storyId } = body;
  if (!jobId) {
    return { statusCode: 400, body: "jobId шаардлагатай" };
  }

  let store;
  try {
    store = getJobsStore();
  } catch (storeErr) {
    console.error("Failed to initialize Blobs store:", storeErr);
    return { statusCode: 500, body: `Blobs init failed: ${String(storeErr && storeErr.message ? storeErr.message : storeErr)}` };
  }

  try {
    await store.setJSON(jobId, { status: "started" });

    if (!childName || !photoBase64) {
      await store.setJSON(jobId, { status: "error", error: "Нэр эсвэл зураг дутуу байна." });
      return { statusCode: 200, body: "done" };
    }
    if (!process.env.GEMINI_API_KEY) {
      await store.setJSON(jobId, {
        status: "error",
        error: "Серверт GEMINI_API_KEY тохируулаагүй байна.",
      });
      return { statusCode: 200, body: "done" };
    }

    const story = STORIES[storyId] || STORIES[DEFAULT_STORY_ID];

    const match = photoBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const rawBase64 = match ? match[2] : photoBase64;

    const prompt = story.buildPrompt(childName);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    await store.setJSON(jobId, { status: "calling-gemini" });

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
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    await store.setJSON(jobId, { status: "gemini-responded" });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      await store.setJSON(jobId, {
        status: "error",
        error: "Gemini зураг буцаасангүй.",
        detail: textPart ? textPart.text : "Хариу хоосон байна.",
      });
      return { statusCode: 200, body: "done" };
    }

    const outMime = imagePart.inlineData.mimeType || "image/png";
    const outData = imagePart.inlineData.data;

    await store.setJSON(jobId, {
      status: "done",
      imageBase64: `data:${outMime};base64,${outData}`,
      storyId: story.id,
    });

    return { statusCode: 200, body: "done" };
  } catch (err) {
    console.error("Gemini generation error:", err);
    await store.setJSON(jobId, {
      status: "error",
      error: "Зураг үүсгэхэд алдаа гарлаа.",
      detail: String(err && err.message ? err.message : err),
    });
    return { statusCode: 200, body: "error" };
  }
};

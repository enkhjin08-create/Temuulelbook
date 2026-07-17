// netlify/functions/generate-story.js
//
// Хүүхдийн нэр, нас, сонирхолд тохирсон 10 хуудас түүхийн тойм (outline)
// зохиодог function. Зөвхөн текст үүсгэдэг тул хурдан (ойролцоогоор 3-8 сек).
//
// Хүлээн авах (POST JSON):
//   { childName, age, interests }
//
// Буцаах (200 JSON):
//   { title, pages: [{ caption, sceneDescription }, ... 10 ширхэг] }

const GEMINI_TEXT_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const PAGE_COUNT = 10;

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

  const { childName, age, interests, gender } = body;

  if (!childName || typeof childName !== "string") {
    return respond(400, { error: "Хүүхдийн нэрийг оруулна уу." });
  }
  if (!age) {
    return respond(400, { error: "Насыг оруулна уу." });
  }
  if (!gender || (gender !== "хүү" && gender !== "охин")) {
    return respond(400, { error: "Хүйсийг сонгоно уу." });
  }
  if (!interests || typeof interests !== "string") {
    return respond(400, { error: "Сонирхлыг оруулна уу." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return respond(500, { error: "Серверт GEMINI_API_KEY тохируулаагүй байна." });
  }

  const genderEn = gender === "хүү" ? "boy" : "girl";
  const pronounEn = gender === "хүү" ? "he/him" : "she/her";

  const prompt = `
You are a children's book author. Write a personalized ${PAGE_COUNT}-page picture
book outline for a ${genderEn} named "${childName}", age ${age}, who is interested in:
${interests}.

CRITICAL: The child is a ${genderEn} (pronouns: ${pronounEn}). Every scene
description and caption must consistently refer to the child as a ${genderEn} —
do not default to the opposite gender, do not use gender-neutral phrasing when a
specific pronoun is natural, and do not switch gender partway through the story.

Requirements:
- Age-appropriate for a ${age}-year-old (simple, warm, gentle themes; nothing scary).
- Weave their interests (${interests}) naturally into the plot and setting.
- Introduce ONE recurring companion character or magical element early on (e.g. an
  animal friend, a magical creature, a helpful object) that stays present and
  visually consistent throughout all ${PAGE_COUNT} pages.
- The story must have a clear beginning (pages 1-2), middle with a small
  challenge or adventure (pages 3-8), and a warm resolution/ending (pages 9-10).
- Each page's "sceneDescription" must be written in ENGLISH, 2-3 sentences, very
  concrete and visual (describing exactly what the child character and companion
  are doing, where they are, what mood/lighting), because it will be used
  word-for-word as an image generation prompt for an illustrator AI. Do NOT
  mention text, speech bubbles, or words appearing in the image.
- Each page's "caption" must be written in MONGOLIAN, a short warm sentence
  (max 12 words) describing that page, suitable as a caption under the illustration.

Return ONLY valid JSON (no markdown code fences, no extra commentary), in exactly
this shape:

{
  "title": "Mongolian story title, short and warm",
  "pages": [
    { "caption": "Монгол хэлээр...", "sceneDescription": "English scene description..." }
    // ... exactly ${PAGE_COUNT} items total
  ]
}
`.trim();

  try {
    const geminiRes = await fetch(`${GEMINI_TEXT_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingConfig: {
            thinkingBudget: 0,
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
    const textPart = parts.find((p) => p.text);

    if (!textPart) {
      return respond(502, { error: "Gemini текст буцаасангүй." });
    }

    let story;
    try {
      story = JSON.parse(textPart.text);
    } catch (e) {
      return respond(502, {
        error: "Gemini-ийн хариу JSON биш байна.",
        detail: textPart.text.slice(0, 500),
      });
    }

    if (!story.pages || !Array.isArray(story.pages) || story.pages.length === 0) {
      return respond(502, { error: "Түүхийн хуудсууд буруу форматтай ирлээ." });
    }

    // Яг PAGE_COUNT хуудас байхыг баталгаажуулна (илүү ирвэл тайрна, дутуу ирвэл байгаагаараа явна)
    const pages = story.pages.slice(0, PAGE_COUNT).map((p) => ({
      caption: String(p.caption || "").slice(0, 200),
      sceneDescription: String(p.sceneDescription || "").slice(0, 1000),
    }));

    return respond(200, {
      title: String(story.title || `${childName}-ийн үлгэр`).slice(0, 200),
      pages,
    });
  } catch (err) {
    console.error("Story generation error:", err);
    return respond(500, {
      error: "Түүх зохиоход алдаа гарлаа. Дахин оролдоно уу.",
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

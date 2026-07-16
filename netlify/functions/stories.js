// netlify/functions/stories.js
//
// Шинэ түүх нэмэхдээ энэ жагсаалтад шинэ объект нэмээд,
// index.html доторх сонголтод storyId-г тааруулна.

const STORIES = {
  "trex-anhnii-uchral": {
    id: "trex-anhnii-uchral",
    title: "Тэмүүлэл Т-Рекс хоёр танилцсан нь",
    coverPrompt: "prehistoric jungle adventure, friendly cartoon T-Rex",
    buildPrompt: (childName) => `
You are illustrating a page from a warm, whimsical children's picture book called
"Тэмүүлэл Т-Рекс хоёр танилцсан нь" (a story about a child named ${childName} who
becomes friends with a gentle, friendly T-Rex in a colorful prehistoric jungle).

CRITICAL — likeness accuracy is the top priority. Study the uploaded photo closely
and preserve, as precisely as possible:
- The exact face shape, eye shape and color, nose, mouth, and expression style
- The exact hairstyle, hair length, and hair color
- The exact skin tone
- The exact clothing the child is wearing in the photo: same garment types, same
  colors, same patterns/prints, same style (e.g. if they're wearing a graphic
  t-shirt with a specific print, keep that print; if striped, keep the stripes;
  match colors closely rather than substituting generic "cheerful adventure clothes")
Do NOT invent a different outfit. Do NOT generalize the face into a generic
cartoon child — the goal is that a parent instantly recognizes their own child,
just rendered in illustrated form. Treat the photo as the ground truth reference
for every visual detail of the child, and only reinterpret the art STYLE (turning
the photo into a painted illustration), not the child's actual appearance or outfit.

Render the scene as a soft, hand-painted children's book illustration:
- warm, saturated colors, gentle lighting, painterly brushwork (not photorealistic)
- the child standing joyfully next to a big, friendly, smiling T-Rex character
- lush prehistoric jungle background with ferns, soft clouds, warm sunlight
- square or portrait book-page composition, no text or watermarks in the image

The final image should feel like a page straight out of a printed children's book —
cozy, magical, and unmistakably featuring this specific child's face and exact outfit
from the reference photo.
`.trim(),
  },
};

const DEFAULT_STORY_ID = "trex-anhnii-uchral";

module.exports = { STORIES, DEFAULT_STORY_ID };

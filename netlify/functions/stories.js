// netlify/functions/stories.js
//
// Шинэ түүх нэмэхдээ энэ жагсаалтад шинэ объект нэмээд, index.html доторх
// сонголтод storyId-г тааруулна.
//
// Түүх бүр "pages" массивтай. Хуудас 0 (эхний хуудас) захиалагчийн бодит
// зургийг reference болгож ашигладаг. Хуудас 1, 2, ... нь өмнөх generate
// хийсэн зургийг reference болгож ашигладаг тул дүр тогтвортой хэвээр үлдэнэ.

const STYLE_GUIDE = `
Art style: Studio Ghibli-inspired hand-painted children's book illustration —
soft painterly brushwork, warm natural lighting, gentle color grading, lush and
detailed nature backgrounds, a cozy and slightly nostalgic atmosphere, expressive
but soft character rendering (think Hayao Miyazaki-style character design: round,
warm, gentle faces, not overly stylized or plastic-looking). Not photorealistic.
No text or watermarks in the image. Square or portrait book-page composition.
`.trim();

const STORIES = {
  "trex-anhnii-uchral": {
    id: "trex-anhnii-uchral",
    title: "Тэмүүлэл Т-Рекс хоёр танилцсан нь",
    coverPrompt: "prehistoric jungle adventure, friendly cartoon T-Rex",

    pages: [
      // Хуудас 0 — захиалагчийн бодит зургийг reference болгоно
      {
        id: "meet",
        usesOriginalPhoto: true,
        buildPrompt: (childName) => `
You are illustrating the FIRST page of a warm, whimsical children's picture book
called "Тэмүүлэл Т-Рекс хоёр танилцсан нь" (a story about a child named ${childName}
who becomes friends with a gentle, friendly T-Rex in a colorful prehistoric jungle).

CRITICAL — likeness accuracy is the top priority. Study the uploaded photo closely
and preserve, as precisely as possible:
- The exact face shape, eye shape and color, nose, mouth, and expression style
- The exact hairstyle, hair length, and hair color
- The exact skin tone
- The exact clothing the child is wearing in the photo: same garment types, same
  colors, same patterns/prints, same style
Do NOT invent a different outfit. Do NOT generalize the face into a generic
cartoon child — the goal is that a parent instantly recognizes their own child,
just rendered in illustrated form. Treat the photo as the ground truth reference
for every visual detail of the child, and only reinterpret the art STYLE, not the
child's actual appearance or outfit.

Scene: the child and a big, friendly, smiling T-Rex meeting for the first time in
a lush prehistoric jungle, ferns and soft clouds and warm sunlight around them,
both looking at each other with curiosity and joy.

${STYLE_GUIDE}

The final image should feel like page 1 of a printed children's book — cozy,
magical, and unmistakably featuring this specific child's face and exact outfit
from the reference photo.
`.trim(),
      },

      // Хуудас 1 — өмнөх generate хийсэн зургийг reference болгоно (тогтвортой дүр)
      {
        id: "play",
        usesOriginalPhoto: false,
        buildPrompt: (childName) => `
You are illustrating the SECOND page of the same children's picture book
"Тэмүүлэл Т-Рекс хоёр танилцсан нь", continuing directly from the previous page.

The attached reference image shows the exact same child character (${childName})
and the exact same T-Rex character, already established in a Ghibli-inspired
illustration style. Keep the child's face, hairstyle, skin tone, and outfit
IDENTICAL to the reference image — do not redesign or change them in any way.
Keep the T-Rex's design identical too.

Scene: the child and the T-Rex are now playing joyfully together — running
through the jungle, the T-Rex gently letting the child ride on its back or chase
after colorful prehistoric butterflies, both laughing and full of energy. New
pose, new action, same characters, same art style.

${STYLE_GUIDE}

The final image should feel like page 2 of the same printed children's book —
same characters, same style, new moment in the story.
`.trim(),
      },

      // Хуудас 2 — мөн адил өмнөх зургийг reference болгоно
      {
        id: "friends",
        usesOriginalPhoto: false,
        buildPrompt: (childName) => `
You are illustrating the THIRD and final page of the same children's picture book
"Тэмүүлэл Т-Рекс хоёр танилцсан нь", continuing directly from the previous page.

The attached reference image shows the exact same child character (${childName})
and the exact same T-Rex character. Keep the child's face, hairstyle, skin tone,
and outfit IDENTICAL to the reference image — do not redesign or change them in
any way. Keep the T-Rex's design identical too.

Scene: the child is now sitting closely against the T-Rex's side at golden-hour
sunset, both peacefully content, the child gently resting a hand on the T-Rex,
fireflies or warm light particles floating in the air, conveying that they have
become best friends. New pose, new mood (calm and warm), same characters, same
art style.

${STYLE_GUIDE}

The final image should feel like the closing page of the same printed children's
book — same characters, same style, an emotional, warm ending moment.
`.trim(),
      },
    ],
  },
};

const DEFAULT_STORY_ID = "trex-anhnii-uchral";

module.exports = { STORIES, DEFAULT_STORY_ID };

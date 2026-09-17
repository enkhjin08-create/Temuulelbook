// netlify/functions/stories.js
//
// Түүх бүрийг Gemini текст загвар (generate-story.js) динамикаар зохиодог
// болсон тул энд түүхийн ТӨРЛИЙН (art style) болон prompt-ын нийтлэг
// бүтцийг л тодорхойлно.

const STYLE_GUIDE = `
Art style: Studio Ghibli-inspired hand-painted children's book illustration —
soft painterly brushwork, warm natural lighting, gentle color grading, lush and
detailed nature backgrounds, a cozy and slightly nostalgic atmosphere, expressive
but soft character rendering (think Hayao Miyazaki-style character design: round,
warm, gentle faces, not overly stylized or plastic-looking). Not photorealistic.
No text or watermarks in the image. Square composition, filling the entire frame
edge-to-edge.

CRITICAL — output the illustration itself ONLY, as flat standalone artwork. Do
NOT render it as a photograph or mockup of a physical printed book: no page
borders, no book spine, no page curl or paper texture, no drop shadow around the
image edges, no hands holding a book, no table/background behind a book, no
picture-frame or poster-mockup presentation. The image must look like a raw
illustration file, not a photo of that illustration placed inside a book or
frame — the person will place it into a book layout themselves afterward.
`.trim();

// pageIndex === 0 үед захиалагчийн бодит зургийг reference болгоно.
// pageIndex > 0 үед өмнөх generate хийсэн зургийг reference болгоно (тогтвортой дүр).
function buildPagePrompt({ childName, gender, sceneDescription, pageIndex, totalPages }) {
  const isFirstPage = pageIndex === 0;
  const pageNum = pageIndex + 1;
  const genderEn = gender === "хүү" ? "boy" : "girl";

  if (isFirstPage) {
    return `
You are illustrating page 1 of ${totalPages} of a warm, whimsical, personalized
children's picture book featuring a ${genderEn} named ${childName}.

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
child's actual appearance or outfit. The child is a ${genderEn} — keep the
illustrated character clearly recognizable as a ${genderEn}.

Scene for this page: ${sceneDescription}

${STYLE_GUIDE}

This establishes the child's illustrated character design, which must stay
identical across all ${totalPages} pages of this book.
`.trim();
  }

  return `
You are illustrating page ${pageNum} of ${totalPages} of the same personalized
children's picture book featuring ${childName} (a ${genderEn}), continuing
directly from the previous page.

The attached reference image shows the exact same child character (${childName})
and any companion character(s), already established in a Ghibli-inspired
illustration style. Keep the child's face, hairstyle, skin tone, and outfit
IDENTICAL to the reference image — do not redesign or change them in any way.
Keep any companion character's design identical too.

Scene for this page: ${sceneDescription}

${STYLE_GUIDE}

The final image should feel like page ${pageNum} of the same printed children's
book — same characters, same style, a new moment in the story.
`.trim();
}

module.exports = { STYLE_GUIDE, buildPagePrompt, buildPatternPrompt, buildBackpagePrompt, buildBackgroundPrompt };

// Номын АР ХАВТАС — эхний хуудасны яг тэр л орчин, өнгө, гэрэлтүүлэг, зурган
// хэв маягтай, гэхдээ ХҮН/ДҮРГҮЙ (тухайн дүр хүрээнээс гарчихсан юм шиг).
function buildBackpagePrompt({ childName, gender }) {
  const genderEn = gender === "хүү" ? "boy" : "girl";

  return `
You are creating the BACK COVER illustration for a personalized children's
picture book, to pair with the attached reference image (the book's front
cover / first-page illustration).

Redraw the EXACT SAME setting, background, environment, color palette,
lighting, and art style as the reference image — but with NO characters, NO
people, NO animals with faces, and NO ${genderEn} anywhere in the scene. Show
only the empty background/setting, as if the character has simply stepped out
of frame. Keep every other visual detail (location, objects, mood, time of
day) identical to the reference.

${STYLE_GUIDE}

This is a back-cover illustration: calm, inviting, and visually consistent with
the reference image's world, but with the scene left completely empty of any
character.
`.trim();
}

// Номын дотор ТЕКСТНИЙ АРД тавих зөөлөн дэвсгэр зураг — түүхийн сэдэвтэй
// холбоотой, гэхдээ дүр/текст ороогүй, дээр нь текст тавихад тохиромжтой.
function buildBackgroundPrompt({ storyTitle, interests, gender, backgroundDescription }) {
  const genderEn = gender === "хүү" ? "boy" : "girl";

  return `
You are designing a soft background illustration to be placed BEHIND text
inside a personalized children's picture book for a ${genderEn}. This is NOT a
story page — it is a decorative background image that text will be overlaid
on top of afterward.

Book context: "${storyTitle}", themed around: ${interests}.

Background description: ${backgroundDescription}

Design requirements:
- Soft, low-contrast, uncluttered composition with generous calm open space so
  text stays easy to read once placed on top of this image
- Thematically connected to the book's story/interests, but understated — this
  supports the text, it must not compete with or overpower it
- NO characters, NO faces, NO people, NO text or letters anywhere in the image
- Gentle, warm, slightly muted color palette consistent with a cozy children's
  book

${STYLE_GUIDE}

The final image should feel like a soft, story-appropriate page background
that text can sit comfortably on top of — not a story scene itself.
`.trim();
}

// Номоо нээнгүүт харагдах чимэглэлийн хээ (endpaper) — дүр, текст ороогүй,
// зөвхөн түүхийн сэдэвтэй холбоотой жижиг дүрс/зүйлсээр давтагдсан хээ.
// Дэвсгэргүй (transparent), сүүдэргүй, A4 хэвтээ (landscape) хэмжээтэй.
function buildPatternPrompt({ storyTitle, interests, gender, patternDescription }) {
  const genderEn = gender === "хүү" ? "boy" : "girl";

  return `
You are designing the decorative endpaper (inside-cover pattern page) of a
personalized children's picture book for a ${genderEn}. This page appears the
moment the book is opened, BEFORE the story begins — it is NOT a story scene and
must NOT contain any characters, people, faces, or text/lettering of any kind.

Book context: "${storyTitle}", themed around: ${interests}.

Pattern description: ${patternDescription}

CRITICAL technical requirements:
- SOLID PLAIN WHITE BACKGROUND — a clean, flat, pure white (#FFFFFF) background
  behind all motifs. No gradients, no textures, no scenery in the background.
- NO drop shadows, NO cast shadows, NO glow/blur effects under or around any
  motif — every element must be flat and shadow-free.
- Landscape (horizontal) A4 page proportions (wider than tall, roughly a 4:3
  landscape framing).
- High resolution, crisp, clean linework — print-quality illustration.

Design requirements:
- A charming, evenly-scattered arrangement of small, simple, flat-illustrated
  motifs/icons related to the book's theme (e.g. small objects, stars, plants,
  playful shapes — whatever fits the theme described above), spread across the
  full landscape canvas with generous transparent space between them
- Soft pastel color palette for the motifs themselves, consistent with a cozy
  children's book
- NO characters, NO faces, NO people, NO animals with faces, NO text or letters
  anywhere in the image
- Flat, gentle, hand-illustrated style (not photorealistic), matching a warm
  Ghibli-inspired children's book aesthetic but purely decorative/ornamental

The final image should look like the inside front cover of a printed children's
book — a delightful pattern on a clean white page that sets the mood before the
story starts.
`.trim();
}

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
No text or watermarks in the image. Square or portrait book-page composition.
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

module.exports = { STYLE_GUIDE, buildPagePrompt, buildPatternPrompt };

// Номоо нээнгүүт харагдах чимэглэлийн хээ (endpaper) — дүр, текст ороогүй,
// зөвхөн түүхийн сэдэвтэй холбоотой жижиг дүрс/зүйлсээр давтагдсан хээ.
function buildPatternPrompt({ storyTitle, interests, gender, patternDescription }) {
  const genderEn = gender === "хүү" ? "boy" : "girl";

  return `
You are designing the decorative endpaper (inside-cover pattern page) of a
personalized children's picture book for a ${genderEn}. This page appears the
moment the book is opened, BEFORE the story begins — it is NOT a story scene and
must NOT contain any characters, people, faces, or text/lettering of any kind.

Book context: "${storyTitle}", themed around: ${interests}.

Pattern description: ${patternDescription}

Design requirements:
- A charming, seamless-feeling all-over repeating pattern of small, simple,
  flat-illustrated motifs/icons related to the book's theme (e.g. small objects,
  stars, plants, playful shapes — whatever fits the theme described above)
- Soft pastel or warm color palette consistent with a cozy children's book
- Evenly scattered, balanced composition covering the whole page edge-to-edge
- NO characters, NO faces, NO people, NO animals with faces, NO text or letters
  anywhere in the image
- Flat, gentle, hand-illustrated style (not photorealistic), matching a warm
  Ghibli-inspired children's book aesthetic but purely decorative/ornamental

The final image should look like the inside front cover of a printed children's
book — a delightful pattern that sets the mood before the story starts.
`.trim();
}

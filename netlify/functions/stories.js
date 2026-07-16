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

Using the uploaded photo as reference, reimagine this child as the storybook's main
character. Keep their face, hair style/color, and skin tone clearly recognizable so
a parent would instantly say "that's my child" — do NOT turn it into a generic
character.

Render the scene as a soft, hand-painted children's book illustration:
- warm, saturated colors, gentle lighting, painterly brushwork (not photorealistic)
- the child standing joyfully next to a big, friendly, smiling T-Rex character
- lush prehistoric jungle background with ferns, soft clouds, warm sunlight
- the child wearing simple, cheerful clothing appropriate for an adventure
- square or portrait book-page composition, no text or watermarks in the image

The final image should feel like a page straight out of a printed children's book —
cozy, magical, and unmistakably featuring this specific child's likeness.
`.trim(),
  },
};

const DEFAULT_STORY_ID = "trex-anhnii-uchral";

module.exports = { STORIES, DEFAULT_STORY_ID };

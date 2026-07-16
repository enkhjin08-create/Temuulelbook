# Pixietale — Зураг → Үлгэрийн дүр (туршилтын MVP)

Захиалагч өөрөө хүүхдийнхээ нэр, гэрэл зургийг оруулаад, Gemini AI ашиглан
"Тэмүүлэл Т-Рекс хоёр танилцсан нь" түүхийн дүр рүү хувиргаж generate хийдэг
дотоод туршилтын сайт.

**Энэ хувилбарт байгаа зүйл:** зөвхөн 1 түүх, төлбөрийн систем байхгүй, зөвхөн
урсгал/загвар шалгах зорилготой.

## Бүтэц

```
index.html                            — гол хуудас
style.css                             — дизайн
script.js                             — upload, form, API дуудалт
netlify/functions/generate-character.js  — Gemini рүү дуудлага хийдэг серверийн function
netlify/functions/stories.js          — түүхийн жагсаалт, prompt (шинэ түүх энд нэмнэ)
netlify.toml                          — Netlify тохиргоо
```

## Deploy хийх алхмууд

### 1. Gemini API key авах
1. https://aistudio.google.com/apikey -руу орно
2. "Create API key" дараад key-г хуулна

### 2. Netlify дээр deploy хийх
1. Энэ folder-ыг GitHub repo болгож push хийнэ (эсвэл шууд Netlify дээр drag-drop хийж болно, гэхдээ function ажиллуулахын тулд Git-тэй холбох нь илүү найдвартай)
2. https://app.netlify.com → "Add new site" → "Import an existing project" → GitHub repo-гоо сонгоно
3. Build settings нь netlify.toml-с автоматаар ирнэ (`npm install`, publish = ".")
4. **Site settings → Environment variables** руу орж, `GEMINI_API_KEY` нэртэй хувьсагч нэмээд, API key-гээ тавина
5. Deploy дуустал хүлээнэ (2-3 минут)

### 3. Локал дээр туршиж үзэх (заавал биш)
```bash
npm install -g netlify-cli
npm install
netlify dev
```
Дараа нь `.env` файл үүсгэж (`.env.example`-ыг хуулбарлаад) `GEMINI_API_KEY`-гээ тавина.

## Шинэ түүх хэрхэн нэмэх вэ

`netlify/functions/stories.js` дотор шинэ объект нэмнэ:

```js
"story-id-name": {
  id: "story-id-name",
  title: "Түүхийн нэр",
  buildPrompt: (childName) => `... энд prompt бичнэ ...`,
}
```

Дараа нь `index.html` дээр сонголт нэмж, `script.js` доторх `STORY_ID`-г
dropdown-той холбоно (одоохондоо 1 түүх учир хатуу бичигдсэн байгаа).

## Мэдэгдэж буй хязгаарлалт

- **Payment байхгүй** — зөвхөн урсгалыг харуулна
- **Admin/шалгах шат байхгүй** — generate хийсэн зураг шууд харагдана. Жинхэнэ
  захиалгын урсгалд орохоос өмнө хүн шалгах алхам (approve/re-generate) нэмэх
  хэрэгтэй болно, учир нь AI зураг заримдаа гажигтай гарч болно
- **Нэг зураг л оруулдаг** — олон зураг (хувцас зэрэг) оруулах шаардлагатай бол
  `generate-character.js` доторх `parts` массивт нэмэлт `inlineData` object
  нэмж болно
- Gemini `gemini-2.5-flash-image` загвар нь заримдаа зурган дээрх хүний царайг
  бүрэн ижилхэн гаргадаггүй тул хэдэн удаа туршиж хамгийн сайныг сонгох
  хэрэгтэй байж магадгүй

# Зөвхөн Түүнд Kids Book — Зураг → Үлгэрийн дүр (туршилтын MVP)

Захиалагч өөрөө хүүхдийнхээ нэр, гэрэл зургийг оруулаад, Gemini AI ашиглан
"Тэмүүлэл Т-Рекс хоёр танилцсан нь" түүхийн дүр рүү хувиргаж generate хийдэг
дотоод туршилтын сайт.

**Энэ хувилбарт байгаа зүйл:** зөвхөн 1 түүх, төлбөрийн систем байхгүй, зөвхөн
урсгал/загвар шалгах зорилготой.

## Бүтэц

```
index.html                            — гол хуудас (нэр, нас, сонирхол, зураг оруулна)
gallery.html                          — generate хийсэн бүх зургийн цуглуулга
style.css                             — дизайн
script.js                             — upload, форм, түүх зохиох + хуудас бүрийг зурах урсгал
netlify/functions/generate-story.js   — нас/сонирхолд тохирсон 10 хуудас түүхийн тойм зохиодог (Gemini текст загвар)
netlify/functions/generate-character.js  — тухайн хуудасны зургийг Gemini-ээр зурдаг function
netlify/functions/gallery-list.js     — gallery-д хадгалагдсан зургуудын жагсаалт
netlify/functions/gallery-image.js    — нэг зургийг шууд <img src> болгож өгдөг
netlify/functions/stories.js          — зурган загварын (Ghibli-inspired) нийтлэг prompt бүтэц
netlify.toml                          — Netlify тохиргоо
```

**Урсгал:** Захиалагч нэр, нас, сонирхол, зургаа оруулна → `generate-story.js` эдгээрт тохирсон 10 хуудас түүхийн тойм (гарчиг + хуудас бүрийн монгол тайлбар + англи scene description) зохионо → эхний хуудсыг захиалагчийн бодит зургийг reference болгож зурна → "Дараагийн хуудас зурах" дарах бүрд өмнөх generate хийсэн зургаа reference болгож, тухайн хуудасны scene-ийг зурж, дүр тогтвортой хэвээр байлгана → 10 хуудас бүрэн дуустал үргэлжилнэ.

**Gallery:** Generate хийгдэх бүр зураг Netlify Blobs-д автоматаар хадгалагддаг тул `/gallery.html` хуудаснаас бүх түүхэн зургийг цаг хугацаагаар нь эрэмбэлж харах боломжтой.

**Тайлбар:** Эхэндээ 10 секундийн синхрон хугацааны хязгаарыг тойрохын тулд "background function + polling" загвар ашигласан ч, Netlify дээрх background function feature нь тогтворгүй/алдаатай (бетта, лог ч харагддаггүй) байсан тул хассан. Одоо **Personal/Pro план дээрх 26 секундийн синхрон хугацаанд шууд найдаж** байна — Gemini ихэвчлэн 15-25 секундэд хариулдаг тул ихэнх тохиолдолд амжина. Хэрэв цаашид байнга хугацаа хэтэрдэг бол, өөр найдвартай queue-архитектур (жишээ нь: гадны database ашигласан жинхэнэ background job) руу шилжих хэрэгтэй болно.

## Deploy хийх алхмууд

### 1. Gemini API key авах
1. https://aistudio.google.com/apikey -руу орно
2. "Create API key" дараад key-г хуулна

### 2. Netlify дээр deploy хийх
1. Энэ folder-ыг GitHub repo болгож push хийнэ
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

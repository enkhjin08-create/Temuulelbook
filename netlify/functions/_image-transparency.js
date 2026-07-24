// netlify/functions/_image-transparency.js
//
// Gemini зурган загварууд "transparent background" гэж хүсэлт тавьсан ч
// ихэвчлэн цагаан дэвсгэртэй PNG буцаадаг. Энэ туслах модуль тэр цагаан
// (эсвэл цагаанд ойрхон) пикселүүдийг тунгалаг (alpha=0) болгож хувиргана.
//
// pngjs бол цэвэр JavaScript сан (native binding байхгүй) тул esbuild-ээр
// найдвартай bundle хийгддэг — өмнө нь native SDK-тай холбоотой асуудалд
// орсон туршлагаас сургамж авсан сонголт.

const { PNG } = require("pngjs");

// base64Data: цэвэр base64 (data: prefix-гүй) PNG өгөгдөл
// threshold: 0-255, энэ утгаас дээш R/G/B бүхий пиксель "цагаан" гэж тооцогдоно
function removeWhiteBackground(base64Data, threshold = 235) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const png = PNG.sync.read(buffer);

    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];

      if (r >= threshold && g >= threshold && b >= threshold) {
        png.data[i + 3] = 0; // бүрэн тунгалаг
      } else {
        // Ирмэг дээрх зөөлөн шилжилтийг арай зөөлрүүлэхийн тулд, цагаанд
        // ойрхон (гэхдээ threshold-ыг давалгүй) пикселүүдийн alpha-г
        // бага зэрэг бууруулна (0-100 хүртэлх зурвас)
        const closeness = (r + g + b) / 3;
        if (closeness > threshold - 40) {
          const fade = Math.max(0, Math.min(1, (closeness - (threshold - 40)) / 40));
          png.data[i + 3] = Math.round(png.data[i + 3] * (1 - fade));
        }
      }
    }

    const outBuffer = PNG.sync.write(png);
    return outBuffer.toString("base64");
  } catch (err) {
    // Боловсруулж чадахгүй бол эх өгөгдлийг хэвээр нь буцаана (алдаа шидэхгүй)
    console.error("removeWhiteBackground failed:", err);
    return base64Data;
  }
}

module.exports = { removeWhiteBackground };

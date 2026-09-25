// netlify/functions/_image-compress.js
//
// Gemini image API PNG (шахалтгүй) хэлбэрээр зураг буцаадаг тул, нарийвчлал
// өндөр (imageSize 2K/1K) үед base64 хэмжээ Netlify Function-ийн синхрон
// хариултын дээд хязгаараас (~6MB) амархан давдаг (413 алдаа). Нягтралыг
// хэвээр нь үлдээгээд, зөвхөн PNG-г JPEG рүү (алдагдалтай боловч нүдэнд
// мэдэгдэхгүй чанартай) хөрвүүлж хэмжээг 5-10 дахин бууруулна.

const { Jimp } = require("jimp");

// mimeType, base64 (data prefix-гүй) авч, JPEG base64 (data prefix-гүй) буцаана.
// Аль хэдийн JPEG бол, эсвэл хөрвүүлэлт амжилтгүй бол эх датагаа хэвээр буцаана.
async function compressToJpeg(mimeType, base64Data, quality = 90) {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return { mimeType, data: base64Data };
  }
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const image = await Jimp.read(buffer);
    const outBuffer = await image.getBuffer("image/jpeg", { quality });
    return { mimeType: "image/jpeg", data: outBuffer.toString("base64") };
  } catch (err) {
    console.error("JPEG compression failed, using original:", err);
    return { mimeType, data: base64Data };
  }
}

module.exports = { compressToJpeg };

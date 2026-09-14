// netlify/functions/showcase-image.js
//
// ПУБЛИК function (PIN шаардахгүй). Зөвхөн pageIndex === 0 (1-р хуудас)
// байхаар баталгаажсан зургийг л буцаана — id таамаглаж бусад хуудас/эх
// зургийг харах боломжгүй байхын тулд metadata-г заавал шалгана.
//
// Showcase хуудас нь зургийг ~180px өргөнтэй карт дотор л харуулдаг тул
// жинхэнэ (олон MB-тай) зургийг шууд буцаах шаардлагагүй — сервер талд
// ЖИЖИГ thumbnail (320px, retina дэлгэцэд ч хангалттай) болгож хувиргаад
// л буцаана. Ингэснээр (1) хуудас хамаагүй хурдан ачаална, (2) хэн ч
// showcase-ээс жинхэнэ өндөр нягтралтай зургийг татаж авах боломжгүй.
//
// GET /.netlify/functions/showcase-image?id=xxxx

const { getStore } = require("@netlify/blobs");
const Jimp = require("jimp");

const THUMB_SIZE = 320; // px, урт талын дээд хэмжээ

function getGalleryStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-gallery", siteID, token });
  }
  return getStore("pixietale-gallery");
}

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: "id шаардлагатай" };
  }
  if (id.endsWith(":original")) {
    return { statusCode: 403, body: "Хандах эрхгүй" };
  }

  try {
    const store = getGalleryStore();
    const meta = await store.getMetadata(id);
    const m = meta && meta.metadata ? meta.metadata : {};

    if (Number(m.pageIndex) !== 0) {
      return { statusCode: 403, body: "Хандах эрхгүй" };
    }

    const data = await store.get(id, { type: "arrayBuffer" });
    if (!data) {
      return { statusCode: 404, body: "Олдсонгүй" };
    }

    const image = await Jimp.read(Buffer.from(data));
    if (image.bitmap.width > THUMB_SIZE || image.bitmap.height > THUMB_SIZE) {
      image.scaleToFit(THUMB_SIZE, THUMB_SIZE);
    }
    image.quality(78);
    const outBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: outBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: String(err && err.message ? err.message : err) };
  }
};

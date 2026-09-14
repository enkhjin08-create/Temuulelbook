// netlify/functions/showcase-image.js
//
// ПУБЛИК function (PIN шаардахгүй). Зөвхөн pageIndex === 0 (1-р хуудас)
// байхаар баталгаажсан зургийг л буцаана — id таамаглаж бусад хуудас/эх
// зургийг харах боломжгүй байхын тулд metadata-г заавал шалгана.
//
// Showcase хуудас нь зургийг ~180px өргөнтэй карт дотор л харуулдаг тул
// жинхэнэ (олон MB-тай) зургийг шууд буцаах шаардлагагүй — сервер талд
// ЖИЖИГ thumbnail (320px) болгож хувиргаад, дээр нь давхар watermark
// тавьж л буцаана. Ингэснээр "Open image in new tab" хийсэн ч цэвэр,
// тамгагүй зураг хэзээ ч харагдахгүй.
//
// GET /.netlify/functions/showcase-image?id=xxxx

const { getStore } = require("@netlify/blobs");
const Jimp = require("jimp");
const path = require("path");

const THUMB_SIZE = 320; // px, урт талын дээд хэмжээ
const WATERMARK_PATH = path.join(__dirname, "assets", "watermark-tile.png");

let watermarkTileCache = null;
async function getWatermarkTile() {
  if (!watermarkTileCache) {
    watermarkTileCache = await Jimp.read(WATERMARK_PATH);
  }
  return watermarkTileCache;
}

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

    // Диагональ, давтагдсан "@kidsbook_zuvhuntuund · ЗАГВАР" watermark —
    // generate хийх үеийн preview-тэй ижил загвар. Grid хэлбэрээр давхарлаж
    // тавьснаар зургийн аль ч хэсэгт watermark орсон байх баталгаатай.
    const tile = await getWatermarkTile();
    const W = image.bitmap.width, H = image.bitmap.height;
    const stepX = tile.bitmap.width * 0.9;
    const stepY = tile.bitmap.height * 0.9;
    for (let y = -tile.bitmap.height; y < H; y += stepY) {
      for (let x = -tile.bitmap.width; x < W; x += stepX) {
        image.composite(tile, Math.round(x), Math.round(y));
      }
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

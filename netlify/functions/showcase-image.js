// netlify/functions/showcase-image.js
//
// ПУБЛИК function (PIN шаардахгүй). Зөвхөн pageIndex === 0 (1-р хуудас)
// байхаар баталгаажсан зургийг л буцаана — id таамаглаж бусад хуудас/эх
// зургийг харах боломжгүй байхын тулд metadata-г заавал шалгана.
//
// GET /.netlify/functions/showcase-image?id=xxxx

const { getStore } = require("@netlify/blobs");

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

    const data = await store.get(id);
    if (!data) {
      return { statusCode: 404, body: "Олдсонгүй" };
    }

    const mimeType = m.mimeType || "image/png";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: data,
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: String(err && err.message ? err.message : err) };
  }
};

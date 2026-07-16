// netlify/functions/gallery-image.js
//
// Нэг зургийг шууд <img src="..."> болгож ашиглах боломжтойгоор буцаана.
//
// GET /.netlify/functions/gallery-image?id=xxxx

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

  try {
    const store = getGalleryStore();
    const [data, meta] = await Promise.all([store.get(id), store.getMetadata(id)]);

    if (!data) {
      return { statusCode: 404, body: "Олдсонгүй" };
    }

    const mimeType = (meta && meta.metadata && meta.metadata.mimeType) || "image/png";

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

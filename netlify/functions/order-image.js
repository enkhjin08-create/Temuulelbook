// netlify/functions/order-image.js
//
// Admin-only. Захиалгын дурын нэг зургийг (эх зураг эсвэл generate хийсэн
// хуудас) шууд <img src> болгож ашиглах боломжтойгоор буцаана.
//
// GET /.netlify/functions/order-image?key=xxxx
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");

function getOrderImagesStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-order-images", siteID, token });
  }
  return getStore("pixietale-order-images");
}

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key) {
    return { statusCode: 400, body: "key шаардлагатай" };
  }

  try {
    const store = getOrderImagesStore();
    const [data, meta] = await Promise.all([store.get(key), store.getMetadata(key)]);

    if (!data) {
      return { statusCode: 404, body: "Олдсонгүй" };
    }

    const mimeType = (meta && meta.metadata && meta.metadata.mimeType) || "image/png";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
      body: data,
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: String(err && err.message ? err.message : err) };
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

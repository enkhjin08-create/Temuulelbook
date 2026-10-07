// netlify/functions/gallery-list.js
//
// Generate хийгдсэн бүх зургийн жагсаалтыг (metadata л, зурган өгөгдөлгүй тул
// хурдан) буцаана.
//
// GET /.netlify/functions/gallery-list
// Буцаах: { items: [{ id, childName, pageIndex, storyId, mimeType, createdAt }, ...] }

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");

function getGalleryStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-gallery", siteID, token });
  }
  return getStore("pixietale-gallery");
}

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  try {
    const store = getGalleryStore();
    const qs = event.queryStringParameters || {};
    const offset = Math.max(0, parseInt(qs.offset, 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(qs.limit, 10) || 12));

    const { blobs } = await store.list();

    // Key нь `${Date.now()}-...` хэлбэртэй тул түлхүүрээр нь эрэмбэлэхэд
    // цагийн дарааллаар гарна — metadata-г зөвхөн харуулах хуудасны
    // зургуудад л уншина (өмнө нь бүх зургийнх унших байсан тул удаан байсан)
    const keys = blobs
      .map((b) => b.key)
      .filter((key) => !key.endsWith(":original"))
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    const pageKeys = keys.slice(offset, offset + limit);

    const metaResults = await Promise.all(
      pageKeys.map(async (key) => {
        try {
          const meta = await store.getMetadata(key);
          return { id: key, ...(meta && meta.metadata ? meta.metadata : {}) };
        } catch (e) {
          return null;
        }
      })
    );

    const limited = metaResults.filter(Boolean);
    const items = { length: keys.length };

    return respond(200, { items: limited, total: items.length, offset, hasMore: offset + limit < items.length });
  } catch (err) {
    return respond(500, { error: String(err && err.message ? err.message : err) });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

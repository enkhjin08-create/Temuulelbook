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
    const { blobs } = await store.list();

    const keys = blobs.map((b) => b.key).filter((key) => !key.endsWith(":original"));

    const metaResults = await Promise.all(
      keys.map(async (key) => {
        try {
          const meta = await store.getMetadata(key);
          return { id: key, ...(meta && meta.metadata ? meta.metadata : {}) };
        } catch (e) {
          return null; // тухайн нэг зурагны metadata уншигдахгүй бол алгасана
        }
      })
    );

    const items = metaResults.filter(Boolean);

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    // Зураг бүрийг тусад нь (PIN-тэй) дуудаж татдаг тул хэт олон бол
    // маш удаан болдог — сүүлийн 30-ыг л буцаана
    const limited = items.slice(0, 30);

    return respond(200, { items: limited, total: items.length });
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

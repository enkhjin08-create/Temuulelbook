// netlify/functions/gallery-list.js
//
// Generate хийгдсэн бүх зургийн жагсаалтыг (metadata л, зурган өгөгдөлгүй тул
// хурдан) буцаана.
//
// GET /.netlify/functions/gallery-list
// Буцаах: { items: [{ id, childName, pageIndex, storyId, mimeType, createdAt }, ...] }

const { getStore } = require("@netlify/blobs");

function getGalleryStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-gallery", siteID, token });
  }
  return getStore("pixietale-gallery");
}

exports.handler = async () => {
  try {
    const store = getGalleryStore();
    const { blobs } = await store.list();

    const items = [];
    for (const b of blobs) {
      try {
        const meta = await store.getMetadata(b.key);
        items.push({ id: b.key, ...(meta && meta.metadata ? meta.metadata : {}) });
      } catch (e) {
        // тухайн нэг зурагны metadata уншигдахгүй бол алгасаад үргэлжлүүлнэ
      }
    }

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err && err.message ? err.message : err) }),
    };
  }
};

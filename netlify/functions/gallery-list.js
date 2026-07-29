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

    const items = [];
    for (const b of blobs) {
      if (b.key.endsWith(":original")) continue; // зөвхөн эх зурагны хос лавлагаагаар ашиглагдана
      try {
        const meta = await store.getMetadata(b.key);
        items.push({ id: b.key, ...(meta && meta.metadata ? meta.metadata : {}) });
      } catch (e) {
        // тухайн нэг зурагны metadata уншигдахгүй бол алгасаад үргэлжлүүлнэ
      }
    }

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return respond(200, { items });
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

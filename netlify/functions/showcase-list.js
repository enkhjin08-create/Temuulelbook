// netlify/functions/showcase-list.js
//
// ПУБЛИК function (PIN шаардахгүй). Зөвхөн 1-р хуудасны (pageIndex === 0)
// generate хийсэн зургуудын жагсаалтыг буцаана — захиалагчид жишээ болгон
// харуулахад зориулагдсан.
//
// GET /.netlify/functions/showcase-list

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
      if (b.key.endsWith(":original")) continue;
      try {
        const meta = await store.getMetadata(b.key);
        const m = meta && meta.metadata ? meta.metadata : {};
        if (Number(m.pageIndex) !== 0) continue; // зөвхөн 1-р хуудас
        items.push({
          id: b.key,
          childName: m.childName || "",
          createdAt: m.createdAt || "",
        });
      } catch (e) {
        // алгасна
      }
    }

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    // Дэлгэц дээр хэт олон зураг ачаалахгүйн тулд сүүлийн 24-ыг л буцаана
    const limited = items.slice(0, 24);

    return respond(200, { items: limited });
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

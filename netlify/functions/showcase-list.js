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

    const keys = blobs.map((b) => b.key).filter((key) => !key.endsWith(":original"));

    const metaResults = await Promise.all(
      keys.map(async (key) => {
        try {
          const meta = await store.getMetadata(key);
          const m = meta && meta.metadata ? meta.metadata : {};
          if (Number(m.pageIndex) !== 0) return null; // зөвхөн 1-р хуудас
          return { id: key, childName: m.childName || "", createdAt: m.createdAt || "" };
        } catch (e) {
          return null;
        }
      })
    );

    const items = metaResults.filter(Boolean);

    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    // Нэг хүүхэд/ном дээр олон удаа дахин зурсан байж болзошгүй тул,
    // нэрээр нь бүлэглээд, хамгийн сүүлийнх (createdAt) нэгийг л үлдээнэ
    const seenNames = new Set();
    const deduped = [];
    for (const item of items) {
      const key = (item.childName || "").trim().toLowerCase() || item.id; // нэргүй бол давхардуулахгүйн тулд id-аар ялгана
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      deduped.push(item);
    }

    // Дэлгэц дээр хэт олон зураг ачаалахгүйн тулд сүүлийн 24-ыг л буцаана
    const limited = deduped.slice(0, 24);

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

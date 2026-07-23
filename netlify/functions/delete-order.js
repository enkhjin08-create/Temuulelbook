// netlify/functions/delete-order.js
//
// Admin-only. Захиалгыг болон түүнд хамаарах бүх зургийг (order-images
// сангаас) устгана.
//
// Хүлээн авах (POST JSON): { id }
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");
const { getOrderImagesStore } = require("./_order-images");

function getOrdersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-orders", siteID, token });
  }
  return getStore("pixietale-orders");
}

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const { id } = body;
  if (!id) return respond(400, { error: "id шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);

    if (raw) {
      // Захиалгад хамаарах зургуудыг устгаж үзнэ (алдаа гарвал ч үргэлжлүүлнэ)
      try {
        const order = JSON.parse(raw);
        const imagesStore = getOrderImagesStore();

        const keysToDelete = [];
        if (order.originalPhotoKey) keysToDelete.push(order.originalPhotoKey);
        if (order.patternImageKey) keysToDelete.push(order.patternImageKey);
        (order.generatedPages || []).forEach((p) => {
          if (p.imageKey) keysToDelete.push(p.imageKey);
        });

        await Promise.all(keysToDelete.map((key) => imagesStore.delete(key).catch(() => {})));
      } catch (e) {
        console.error("delete-order: image cleanup failed:", e);
      }
    }

    await store.delete(id);

    return respond(200, { ok: true });
  } catch (err) {
    console.error("delete-order error:", err);
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

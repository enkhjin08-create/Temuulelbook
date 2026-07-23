// netlify/functions/set-order-pattern.js
//
// Admin-only. Захиалгад чимэглэлийн хээний зургийг хадгална (эсвэл шинэчилнэ).
//
// Хүлээн авах (POST JSON): { id, imageBase64, patternDescription }
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");
const { saveOrderImage } = require("./_order-images");

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

  const { id, imageBase64, patternDescription } = body;
  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (!imageBase64) return respond(400, { error: "imageBase64 шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);

    const patternImageKey = `${id}:pattern`;
    await saveOrderImage(patternImageKey, imageBase64);

    order.patternImageKey = patternImageKey;
    order.patternDescription = patternDescription || order.patternDescription || "";
    order.updatedAt = new Date().toISOString();

    await store.set(id, JSON.stringify(order), {
      metadata: {
        childName: order.childName,
        customerEmail: order.customerEmail || "",
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        totalPages: order.storyPages.length,
        pageCount: order.generatedPages.length,
        contactPhone: order.contactPhone,
        price: order.price,
      },
    });

    return respond(200, { ok: true });
  } catch (err) {
    console.error("set-order-pattern error:", err);
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

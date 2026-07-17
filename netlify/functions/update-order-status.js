// netlify/functions/update-order-status.js
//
// Admin-only. Захиалгын статусыг гараар өөрчилнэ (жишээ нь төлбөр
// баталгаажсаны дараа "paid" болгох).
//
// Хүлээн авах (POST JSON): { id, status }
// status нь "new" | "paid" | "completed" | "cancelled" байна
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");

const VALID_STATUSES = ["new", "paid", "completed", "cancelled"];

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

  const { id, status } = body;
  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (!VALID_STATUSES.includes(status)) {
    return respond(400, { error: `status нь ${VALID_STATUSES.join(", ")}-ийн аль нэг байх ёстой.` });
  }

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);
    order.status = status;
    order.updatedAt = new Date().toISOString();

    await store.set(id, JSON.stringify(order), {
      metadata: {
        childName: order.childName,
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

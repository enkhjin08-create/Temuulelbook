// netlify/functions/set-order-photo.js
//
// Admin-only. Захиалгын хүүхдийн ЭХ (reference) зургийг шинэ зургаар
// сольж хадгална — жишээ нь захиалагчийн илгээсэн зураг муу чанартай эсвэл
// царай тод харагдахгүй үед, admin өөр зураг оруулж 1-р хуудсыг дахин
// зурахад ашиглах боломжтой болгоно.
//
// Хүлээн авах (POST JSON): { id, photoBase64 }
// Header: x-admin-pin
// Буцаах (200 JSON): { ok: true }

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

  const { id, photoBase64 } = body;
  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (!photoBase64 || typeof photoBase64 !== "string") {
    return respond(400, { error: "photoBase64 шаардлагатай." });
  }

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);

    const photoKey = order.originalPhotoKey || `${id}:original`;
    await saveOrderImage(photoKey, photoBase64);

    if (!order.originalPhotoKey) {
      order.originalPhotoKey = photoKey;
    }
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

    return respond(200, { ok: true, originalPhotoKey: photoKey });
  } catch (err) {
    console.error("set-order-photo error:", err);
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

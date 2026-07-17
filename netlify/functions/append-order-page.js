// netlify/functions/append-order-page.js
//
// Admin-only. Admin шинэ хуудас generate хийсний дараа тэр зургийг
// захиалгын мэдээлэлд нэмж хадгална. Хамгийн сүүлийн хуудас бол статусыг
// автоматаар "completed" болгоно.
//
// Хүлээн авах (POST JSON): { id, pageIndex, imageBase64, caption }
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");

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

  const { id, imageBase64, caption } = body;
  const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : null;

  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (pageIndex === null) return respond(400, { error: "pageIndex шаардлагатай." });
  if (!imageBase64) return respond(400, { error: "imageBase64 шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);

    // Хэрэв тухайн pageIndex аль хэдийн байгаа бол шинэчилнэ, үгүй бол нэмнэ
    const existingIdx = order.generatedPages.findIndex((p) => p.pageIndex === pageIndex);
    const pageEntry = { pageIndex, imageBase64, caption: caption || "" };
    if (existingIdx >= 0) {
      order.generatedPages[existingIdx] = pageEntry;
    } else {
      order.generatedPages.push(pageEntry);
    }
    order.generatedPages.sort((a, b) => a.pageIndex - b.pageIndex);

    const isLastPage = pageIndex >= order.storyPages.length - 1;
    if (isLastPage && order.status !== "cancelled") {
      order.status = "completed";
    }
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

    return respond(200, { ok: true, status: order.status, pageCount: order.generatedPages.length });
  } catch (err) {
    console.error("append-order-page error:", err);
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

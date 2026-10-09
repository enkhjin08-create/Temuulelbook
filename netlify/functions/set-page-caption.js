// netlify/functions/set-page-caption.js
//
// Admin-only. Хуудасны ХЭВЛЭГДЭХ текстийг (caption) зураг дахин generate
// хийлгүйгээр хадгална. Хуудас generate хийгдсэн бол generatedPages дахь
// caption-г, хараахан хийгдээгүй бол storyPages дахь текстийг шинэчилнэ.
//
// Хүлээн авах (POST JSON): { id, pageIndex, caption }
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

  const { id, caption } = body;
  const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : null;
  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (pageIndex === null) return respond(400, { error: "pageIndex шаардлагатай." });
  if (typeof caption !== "string") return respond(400, { error: "caption шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);
    const text = caption.trim();
    const g = (order.generatedPages || []).find((p) => p.pageIndex === pageIndex);
    if (g) {
      g.caption = text;
    } else if (order.storyPages && order.storyPages[pageIndex]) {
      order.storyPages[pageIndex].caption = text;
    } else {
      return respond(400, { error: "Ийм хуудас олдсонгүй." });
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

    return respond(200, { ok: true, pageIndex, caption: text });
  } catch (err) {
    console.error("set-page-caption error:", err);
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

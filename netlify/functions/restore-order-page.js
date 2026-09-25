// netlify/functions/restore-order-page.js
//
// Admin-only. Admin "Дахин зурах" дарж шинэ зураг гаргуулсан ч таалагдаагүй
// тохиолдолд, хамгийн сүүлд дарагдсан ӨМНӨХ зургийг сэргээнэ.
//
// Одоогийн болон нөөцлөгдсөн (":prev") зургийг СОЛИЖ (swap) хадгалдаг тул,
// дахин дарвал буцаад "сэргээхээс өмнөх" (өөрөөр хэлбэл хамгийн сүүлийн
// шинэ) зурагтаа шилжиж болно — өгөгдөл алдагдахгүй.
//
// Хүлээн авах (POST JSON): { id, pageIndex }
// Header: x-admin-pin
// Буцаах (200 JSON): { ok: true, imageBase64 }

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
  const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : null;

  if (!id) return respond(400, { error: "id шаардлагатай." });
  if (pageIndex === null) return respond(400, { error: "pageIndex шаардлагатай." });

  try {
    const ordersStore = getOrdersStore();
    const raw = await ordersStore.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);

    const pageIdx = order.generatedPages.findIndex((p) => p.pageIndex === pageIndex);
    if (pageIdx < 0) {
      return respond(404, { error: "Энэ хуудас хараахан зураагүй байна." });
    }
    const pageEntry = order.generatedPages[pageIdx];
    if (!pageEntry.hasPrevious) {
      return respond(400, { error: "Энэ хуудсанд сэргээх өмнөх хувилбар алга." });
    }

    const imageKey = pageEntry.imageKey;
    const prevKey = `${imageKey}:prev`;

    const imagesStore = getOrderImagesStore();
    const [currentData, currentMeta, prevData, prevMeta] = await Promise.all([
      imagesStore.get(imageKey),
      imagesStore.getMetadata(imageKey),
      imagesStore.get(prevKey),
      imagesStore.getMetadata(prevKey),
    ]);

    if (!prevData) {
      return respond(404, { error: "Өмнөх хувилбар олдсонгүй." });
    }

    const currentMime = (currentMeta && currentMeta.metadata && currentMeta.metadata.mimeType) || "image/jpeg";
    const prevMime = (prevMeta && prevMeta.metadata && prevMeta.metadata.mimeType) || "image/jpeg";

    // Одоогийн зургийг "prev" болгож, өмнөх зургийг одоогийн болгож солино
    // (swap) — ингэснээр дахин дарвал буцаад солигдож болно.
    await Promise.all([
      imagesStore.set(imageKey, prevData, { metadata: { mimeType: prevMime } }),
      currentData
        ? imagesStore.set(prevKey, currentData, { metadata: { mimeType: currentMime } })
        : Promise.resolve(),
    ]);

    order.updatedAt = new Date().toISOString();
    await ordersStore.set(id, JSON.stringify(order), {
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

    return respond(200, { ok: true, imageBase64: `data:${prevMime};base64,${prevData}` });
  } catch (err) {
    console.error("restore-order-page error:", err);
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

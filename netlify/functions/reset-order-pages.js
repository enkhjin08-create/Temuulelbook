// netlify/functions/reset-order-pages.js
//
// Admin-only. 1-р хуудсыг эс тооцвол, захиалгын бусад бүх generate хийсэн
// хуудсыг цэвэрлэнэ (өмнөх үр дүн таалагдаагүй үед дахин эхлэхэд ашиглана).
//
// Хүлээн авах (POST JSON): { id }
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

  const { id } = body;
  if (!id) return respond(400, { error: "id шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }

    const order = JSON.parse(raw);

    // Зөвхөн 1-р хуудсыг (pageIndex === 0) үлдээж, бусдыг цэвэрлэнэ.
    // Blobs дахь зургийн key нь `${id}:page${pageIndex}` хэлбэртэй, тогтмол
    // тул дараа дахин generate хийхэд яг тэр л key дээр дахин бичигдэнэ —
    // тусад нь устгах шаардлагагүй.
    order.generatedPages = (order.generatedPages || []).filter((p) => p.pageIndex === 0);
    order.updatedAt = new Date().toISOString();

    // Захиалга "дууссан" төлөвт байсан бол, дахин "төлсөн" төлөвт буцаана
    if (order.status === "completed") {
      order.status = "paid";
    }

    await store.set(id, JSON.stringify(order), {
      metadata: {
        childName: order.childName,
        orderNumber: order.orderNumber || "",
        customerEmail: order.customerEmail || "",
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        totalPages: order.storyPages.length,
        pageCount: order.generatedPages.length,
        contactPhone: order.contactPhone,
        contactAddress: order.contactAddress,
        price: order.price,
      },
    });

    return respond(200, { ok: true });
  } catch (err) {
    console.error("reset-order-pages error:", err);
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

// netlify/functions/update-order-status.js
//
// Admin-only. Захиалгын статусыг гараар өөрчилнэ (жишээ нь төлбөр
// баталгаажсаны дараа "paid" болгох). Статус өөрчлөгдөх бүрд захиалагчид
// имэйл мэдэгдэл илгээнэ.
//
// Хүлээн авах (POST JSON): { id, status }
// status нь "new" | "paid" | "completed" | "cancelled" байна
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");
const { sendEmail } = require("./_email");

const VALID_STATUSES = ["new", "paid", "completed", "cancelled"];

const STATUS_EMAIL = {
  paid: {
    subject: "Төлбөр баталгаажлаа — Зөвхөн Түүнд Kids Book",
    body: (order) => `
      <h2>Төлбөр баталгаажлаа ✅</h2>
      <p><b>${escapeHtml(order.childName)}</b>-ийн үлгэрийн үлдсэн хуудсуудыг бид одоо зурж эхэллээ.</p>
      <p>Бэлэн болмогц дахин имэйлээр мэдэгдэнэ.</p>
    `,
  },
  completed: {
    subject: "Таны хүүхдийн ном бэлэн боллоо! — Зөвхөн Түүнд Kids Book",
    body: (order) => `
      <h2>🎉 Ном бэлэн боллоо!</h2>
      <p><b>${escapeHtml(order.childName)}</b>-ийн 10 хуудас бүхий үлгэр бүрэн зурагдаж дууслаа.</p>
      <p>Бид тантай удахгүй холбогдож, хэвлэлт болон хүргэлтийн дэлгэрэнгүйг илгээнэ.</p>
    `,
  },
  cancelled: {
    subject: "Захиалга цуцлагдлаа — Зөвхөн Түүнд Kids Book",
    body: (order) => `
      <h2>Захиалга цуцлагдлаа</h2>
      <p><b>${escapeHtml(order.childName)}</b>-ийн захиалга цуцлагдсан тухай мэдэгдэж байна.</p>
      <p>Асуулт байвал бидэнтэй холбогдоно уу.</p>
    `,
  },
};

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
    const statusChanged = order.status !== status;
    order.status = status;
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

    if (statusChanged && order.customerEmail && STATUS_EMAIL[status]) {
      const emailTemplate = STATUS_EMAIL[status];
      sendEmail({
        to: order.customerEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.body(order),
      }).catch(() => {});
    }

    return respond(200, { ok: true });
  } catch (err) {
    return respond(500, { error: String(err && err.message ? err.message : err) });
  }
};

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

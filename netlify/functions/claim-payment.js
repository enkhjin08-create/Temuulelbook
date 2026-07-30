// netlify/functions/claim-payment.js
//
// Захиалагч "Би төлбөр төлсөн" товч дарахад дуудагдана. Захиалгын статусыг
// шууд өөрчлөхгүй (admin л баталгаажуулна), харин мэдэгдэл бичиж, admin руу
// имэйл илгээнэ — ингэснээр admin гүйлгээгээ шалгаад "Төлсөн" гэж тэмдэглэнэ.
//
// Хүлээн авах (POST JSON): { orderId }
// Header: x-auth-token (захиалгын эзэн байх ёстой)

const { getStore } = require("@netlify/blobs");
const { checkSession } = require("./_auth");
const { sendEmail } = require("./_email");

const ADMIN_NOTIFY_EMAIL = "info.zuvhuntuund@gmail.com";

function getOrdersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-orders", siteID, token });
  }
  return getStore("pixietale-orders");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });
  }

  const session = await checkSession(event);
  if (!session.ok) {
    return respond(401, { error: "Энэ үйлдлийг хийхийн тулд нэвтэрч орно уу." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const { orderId } = body;
  if (!orderId) return respond(400, { error: "orderId шаардлагатай." });

  try {
    const store = getOrdersStore();
    const raw = await store.get(orderId);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);

    if (order.customerEmail !== session.email) {
      return respond(403, { error: "Энэ захиалга танд хамаарахгүй байна." });
    }

    order.paymentClaimedAt = new Date().toISOString();
    order.updatedAt = order.paymentClaimedAt;

    await store.set(orderId, JSON.stringify(order), {
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

    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `💰 Төлбөр мэдэгдлээ: ${order.childName} (#${order.orderNumber || ""})`,
      html: `
        <h2>Захиалагч төлбөр төлсөн гэж мэдэгдлээ</h2>
        <p><b>Захиалгын дугаар:</b> ${escapeHtml(order.orderNumber || "")}</p>
        <p><b>Хүүхэд:</b> ${escapeHtml(order.childName)}</p>
        <p><b>Захиалагчийн и-мэйл:</b> ${escapeHtml(session.email)}</p>
        <p>Дансаа шалгаад баталгаажвал admin хуудсаар "Төлсөн" гэж тэмдэглэнэ үү.</p>
        <p><a href="https://kidsbook.zuvhuntuund.com/admin.html">Admin хуудсаар нээж харах</a></p>
      `,
    }).catch(() => {});

    return respond(200, { ok: true });
  } catch (err) {
    console.error("claim-payment error:", err);
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

// netlify/functions/create-order.js
//
// Захиалагч эхний хуудсаа хараад таалагдаад захиалга өгөхөд дуудагдана.
// Нэвтэрсэн хэрэглэгч байх ёстой (session token шаардлагатай).
//
// Хүлээн авах (POST JSON):
//   { childName, gender, age, interests, storyTitle, storyPages,
//     photoBase64, firstPageImageBase64, contactPhone, contactNote }
//
// Буцаах (200 JSON): { id, bank: { bankName, accountNumber, accountHolder } }

const { getStore } = require("@netlify/blobs");
const { checkSession } = require("./_auth");
const { sendEmail } = require("./_email");

const PRICE = 120000;
const ADMIN_NOTIFY_EMAIL = "info.zuvhuntuund@gmail.com";
const BANK = {
  bankName: "Хаан банк",
  accountNumber: "MN490005005304653256",
  accountHolder: "Энхжин",
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

  const {
    childName, gender, age, interests, storyTitle, storyPages,
    photoBase64, firstPageImageBase64, contactPhone, contactNote,
  } = body;

  if (!childName || typeof childName !== "string") {
    return respond(400, { error: "Хүүхдийн нэр дутуу байна." });
  }
  if (!Array.isArray(storyPages) || storyPages.length === 0) {
    return respond(400, { error: "Түүхийн хуудсууд дутуу байна." });
  }
  if (!firstPageImageBase64) {
    return respond(400, { error: "Эхний хуудасны зураг дутуу байна." });
  }
  if (!contactPhone || typeof contactPhone !== "string") {
    return respond(400, { error: "Утасны дугаар оруулна уу." });
  }

  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const order = {
      id,
      customerEmail: session.email,
      childName,
      gender: gender || "",
      age: age || "",
      interests: interests || "",
      storyTitle: storyTitle || "",
      storyPages,
      photoBase64: photoBase64 || "",
      generatedPages: [
        { pageIndex: 0, imageBase64: firstPageImageBase64, caption: storyPages[0].caption || "" },
      ],
      contactPhone,
      contactNote: contactNote || "",
      status: "new",
      price: PRICE,
      createdAt: now,
      updatedAt: now,
    };

    const store = getOrdersStore();
    await store.set(id, JSON.stringify(order), {
      metadata: {
        childName,
        customerEmail: session.email,
        status: order.status,
        createdAt: now,
        updatedAt: now,
        totalPages: storyPages.length,
        pageCount: 1,
        contactPhone,
        price: PRICE,
      },
    });

    // Имэйл илгээх (алдаа гарвал ч захиалгыг тасалдуулахгүй)
    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `🎉 Шинэ захиалга: ${childName}`,
      html: `
        <h2>Шинэ захиалга ирлээ</h2>
        <p><b>Хүүхэд:</b> ${escapeHtml(childName)} (${escapeHtml(gender || "")}, ${escapeHtml(String(age || ""))} нас)</p>
        <p><b>Сонирхол:</b> ${escapeHtml(interests || "")}</p>
        <p><b>Түүх:</b> ${escapeHtml(storyTitle || "")}</p>
        <p><b>Утас:</b> ${escapeHtml(contactPhone)}</p>
        <p><b>Тэмдэглэл:</b> ${escapeHtml(contactNote || "—")}</p>
        <p><b>Захиалагчийн и-мэйл:</b> ${escapeHtml(session.email)}</p>
        <p><b>Үнэ:</b> ${PRICE.toLocaleString()}₮</p>
        <p><a href="https://temuulelbook.netlify.app/admin.html">Admin хуудсаар нээж харах</a></p>
      `,
    }).catch(() => {});

    sendEmail({
      to: session.email,
      subject: "Таны захиалга бүртгэгдлээ — Зөвхөн Түүнд Kids Book",
      html: `
        <h2>Баярлалаа, захиалга бүртгэгдлээ! 🎉</h2>
        <p><b>${escapeHtml(childName)}</b>-ийн хувийн үлгэрийг бид одоо бэлдэж эхэлнэ.</p>
        <p><b>Үнэ:</b> ${PRICE.toLocaleString()}₮</p>
        <p>Дараах дансанд шилжүүлгээ хийнэ үү:</p>
        <ul>
          <li><b>Банк:</b> ${BANK.bankName}</li>
          <li><b>Данс:</b> ${BANK.accountNumber}</li>
          <li><b>Хүлээн авагч:</b> ${BANK.accountHolder}</li>
        </ul>
        <p>Төлбөр баталгаажсаны дараа бид имэйлээр мэдэгдэнэ.</p>
      `,
    }).catch(() => {});

    return respond(200, { id, bank: BANK });
  } catch (err) {
    console.error("create-order error:", err);
    return respond(500, {
      error: "Захиалга хадгалахад алдаа гарлаа.",
      detail: String(err && err.message ? err.message : err),
    });
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

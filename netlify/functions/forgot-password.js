// netlify/functions/forgot-password.js
//
// Хүлээн авах (POST JSON): { email }
// Буцаах (200 JSON): { ok: true }  (и-мэйл бүртгэлтэй эсэхээс үл хамааран
// ямагт ижил хариу буцаана — аюулгүй байдлын үүднээс бүртгэлийн мэдээллийг
// задруулахгүй байхын тулд)

const { getUsersStore, normalizeEmail, createResetToken } = require("./_auth");
const { sendEmail } = require("./_email");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return respond(400, { error: "И-мэйл хаягаа оруулна уу." });
  }

  try {
    const store = getUsersStore();
    const raw = await store.get(email);

    if (raw) {
      const resetToken = await createResetToken(email);
      const host = (event.headers && (event.headers.host || event.headers.Host)) || "temuulelbook.netlify.app";
      const resetUrl = `https://${host}/?reset=${resetToken}`;

      await sendEmail({
        to: email,
        subject: "Нууц үг сэргээх — Зөвхөн Түүнд Kids Book",
        html: `
          <h2>Нууц үг сэргээх хүсэлт 🔑</h2>
          <p>Шинэ нууц үг тохируулахын тулд доорх товч дээр дарна уу:</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#F2836B;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">Нууц үг сэргээх</a></p>
          <p>Эсвэл энэ холбоосыг хуулж хөтчид тавина уу:<br>${resetUrl}</p>
          <p style="color:#888;font-size:12px;">Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлож болно. Холбоос 1 цагийн дараа хүчингүй болно.</p>
        `,
      });
    }

    // И-мэйл бүртгэлтэй эсэхийг задруулахгүйн тулд ямагт ижил амжилттай хариу буцаана
    return respond(200, { ok: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return respond(500, { error: "Алдаа гарлаа. Дахин оролдоно уу." });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

// netlify/functions/signup.js
//
// Хүлээн авах (POST JSON): { email, password }
// Буцаах (200 JSON): { pendingVerification: true, email }
//
// Session шууд үүсгэдэггүй — эхлээд имэйл рүү баталгаажуулах холбоос
// илгээгээд, тэр дээр дарсны дараа л (verify-email.js) нэвтэрсэн болно.

const {
  getUsersStore, normalizeEmail, isValidEmail, hashPassword,
  createVerificationToken,
} = require("./_auth");
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
  const password = body.password || "";

  if (!isValidEmail(email)) {
    return respond(400, { error: "И-мэйл хаяг буруу байна." });
  }
  if (password.length < 6) {
    return respond(400, { error: "Нууц үг доод тал нь 6 тэмдэгт байх ёстой." });
  }

  try {
    const store = getUsersStore();
    const existingRaw = await store.get(email);

    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (existing.verified) {
        return respond(409, { error: "Энэ и-мэйл хаягаар аль хэдийн бүртгүүлсэн байна. Нэвтэрч орно уу." });
      }
      // Баталгаажуулаагүй хуучин бүртгэл байвал дахин баталгаажуулах холбоос илгээнэ
    }

    const user = {
      email,
      passwordHash: hashPassword(password),
      verified: false,
      createdAt: new Date().toISOString(),
    };
    await store.set(email, JSON.stringify(user));

    const verifyToken = await createVerificationToken(email);
    const host = (event.headers && (event.headers.host || event.headers.Host)) || "temuulelbook.netlify.app";
    const verifyUrl = `https://${host}/?verify=${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "И-мэйлээ баталгаажуулна уу — Зөвхөн Түүнд Kids Book",
      html: `
        <h2>Тавтай морил! 👋</h2>
        <p>Бүртгэлээ идэвхжүүлэхийн тулд доорх товч дээр дарна уу:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;background:#F2836B;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">И-мэйлээ баталгаажуулах</a></p>
        <p>Эсвэл энэ холбоосыг хуулж хөтчид тавина уу:<br>${verifyUrl}</p>
        <p style="color:#888;font-size:12px;">Энэ холбоос 24 цагийн дараа хүчингүй болно.</p>
      `,
    });

    return respond(200, { pendingVerification: true, email });
  } catch (err) {
    console.error("signup error:", err);
    return respond(500, { error: "Бүртгүүлэхэд алдаа гарлаа.", detail: String(err && err.message ? err.message : err) });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

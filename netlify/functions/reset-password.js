// netlify/functions/reset-password.js
//
// Хүлээн авах (POST JSON): { token, newPassword }
// Буцаах (200 JSON): { token, email }  (амжилттай бол шинэ session token,
// хэрэглэгч автоматаар нэвтэрсэн болно)

const {
  getUsersStore, consumeResetToken, hashPassword, createSession,
} = require("./_auth");

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

  const { token, newPassword } = body;
  if (!token) {
    return respond(400, { error: "Token дутуу байна." });
  }
  if (!newPassword || newPassword.length < 6) {
    return respond(400, { error: "Шинэ нууц үг доод тал нь 6 тэмдэгт байх ёстой." });
  }

  try {
    const result = await consumeResetToken(token);
    if (!result.ok) {
      return respond(400, { error: "Холбоос хүчингүй эсвэл хугацаа дууссан байна. Дахин хүсэлт илгээнэ үү." });
    }

    const store = getUsersStore();
    const raw = await store.get(result.email);
    if (!raw) {
      return respond(404, { error: "Хэрэглэгч олдсонгүй." });
    }
    const user = JSON.parse(raw);
    user.passwordHash = hashPassword(newPassword);
    await store.set(result.email, JSON.stringify(user));

    const sessionToken = await createSession(result.email);
    return respond(200, { token: sessionToken, email: result.email });
  } catch (err) {
    console.error("reset-password error:", err);
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
 

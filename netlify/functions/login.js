// netlify/functions/login.js
//
// Хүлээн авах (POST JSON): { email, password }
// Буцаах (200 JSON): { token, email }

const { getUsersStore, normalizeEmail, verifyPassword, createSession } = require("./_auth");

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

  if (!email || !password) {
    return respond(400, { error: "И-мэйл болон нууц үгээ оруулна уу." });
  }

  try {
    const store = getUsersStore();
    const raw = await store.get(email);
    if (!raw) {
      return respond(401, { error: "И-мэйл эсвэл нууц үг буруу байна." });
    }

    const user = JSON.parse(raw);
    if (!verifyPassword(password, user.passwordHash)) {
      return respond(401, { error: "И-мэйл эсвэл нууц үг буруу байна." });
    }

    const token = await createSession(email);
    return respond(200, { token, email });
  } catch (err) {
    console.error("login error:", err);
    return respond(500, { error: "Нэвтрэхэд алдаа гарлаа.", detail: String(err && err.message ? err.message : err) });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

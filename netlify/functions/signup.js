// netlify/functions/signup.js
//
// Хүлээн авах (POST JSON): { email, password }
// Буцаах (200 JSON): { token, email }

const { getUsersStore, normalizeEmail, isValidEmail, hashPassword, createSession } = require("./_auth");

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
    const existing = await store.get(email);
    if (existing) {
      return respond(409, { error: "Энэ и-мэйл хаягаар аль хэдийн бүртгүүлсэн байна. Нэвтэрч орно уу." });
    }

    const user = {
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await store.set(email, JSON.stringify(user));

    const token = await createSession(email);
    return respond(200, { token, email });
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

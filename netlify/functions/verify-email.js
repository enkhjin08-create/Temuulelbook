// netlify/functions/verify-email.js
//
// И-мэйл дэх баталгаажуулах холбоос дээр дарахад дуудагдана.
//
// GET /.netlify/functions/verify-email?token=xxxx
// Буцаах (200 JSON): { token, email }  (амжилттай бол шинэ session token)

const { getUsersStore, consumeVerificationToken, createSession } = require("./_auth");

exports.handler = async (event) => {
  const token = event.queryStringParameters && event.queryStringParameters.token;
  if (!token) {
    return respond(400, { error: "Баталгаажуулах token дутуу байна." });
  }

  try {
    const result = await consumeVerificationToken(token);
    if (!result.ok) {
      return respond(400, { error: "Холбоос хүчингүй эсвэл хугацаа дууссан байна. Дахин бүртгүүлж үзнэ үү." });
    }

    const store = getUsersStore();
    const raw = await store.get(result.email);
    if (!raw) {
      return respond(404, { error: "Хэрэглэгч олдсонгүй." });
    }
    const user = JSON.parse(raw);
    user.verified = true;
    await store.set(result.email, JSON.stringify(user));

    const sessionToken = await createSession(result.email);
    return respond(200, { token: sessionToken, email: result.email });
  } catch (err) {
    console.error("verify-email error:", err);
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

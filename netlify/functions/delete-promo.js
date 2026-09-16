// netlify/functions/delete-promo.js
//
// Admin-only. Промо кодыг устгана.
//
// Хүлээн авах (POST JSON): { code }
// Header: x-admin-pin

const { checkAdminPin } = require("./_admin-auth");
const { getPromoStore, normalizeCode } = require("./_promo");

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

  const code = normalizeCode(body.code);
  if (!code) return respond(400, { error: "code шаардлагатай." });

  try {
    const store = getPromoStore();
    const raw = await store.get(code);
    if (!raw) return respond(404, { error: "Промо код олдсонгүй." });

    await store.delete(code);
    return respond(200, { ok: true });
  } catch (err) {
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

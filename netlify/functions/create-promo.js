// netlify/functions/create-promo.js
//
// Admin-only. Промо код үүсгэнэ (эсвэл ижил кодоор дахин дуудвал шинэчилнэ).
//
// Хүлээн авах (POST JSON):
//   { code, discountType: "percent"|"fixed", discountValue, usageLimit, expiresAt }
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
  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Number(body.discountValue);
  const usageLimit = body.usageLimit ? Number(body.usageLimit) : null;
  const expiresAt = body.expiresAt || null;

  if (!code) {
    return respond(400, { error: "Промо код оруулна уу." });
  }
  if (!discountValue || discountValue <= 0) {
    return respond(400, { error: "Хямдралын хэмжээг зөв оруулна уу." });
  }
  if (discountType === "percent" && discountValue > 100) {
    return respond(400, { error: "Хувийн хямдрал 100-с их байж болохгүй." });
  }

  try {
    const store = getPromoStore();
    const existingRaw = await store.get(code);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;

    const promo = {
      code,
      discountType,
      discountValue,
      usageLimit,
      usageCount: existing ? existing.usageCount : 0,
      active: true,
      expiresAt,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.set(code, JSON.stringify(promo));

    return respond(200, { ok: true, promo });
  } catch (err) {
    console.error("create-promo error:", err);
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

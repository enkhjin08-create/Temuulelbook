// netlify/functions/_promo.js
//
// Промо кодтой холбоотой туслах модуль. Энэ файл өөрөө endpoint биш.

const { getStore } = require("@netlify/blobs");

const BASE_PRICE = 120000;

function getPromoStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-promocodes", siteID, token });
  }
  return getStore("pixietale-promocodes");
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

// promo: { code, discountType: "percent"|"fixed", discountValue, usageLimit, usageCount, active, expiresAt, createdAt }
function computeFinalPrice(promo, basePrice = BASE_PRICE) {
  let discountAmount = 0;
  if (promo.discountType === "percent") {
    discountAmount = Math.round((basePrice * promo.discountValue) / 100);
  } else {
    discountAmount = promo.discountValue;
  }
  discountAmount = Math.max(0, Math.min(discountAmount, basePrice));
  return {
    basePrice,
    discountAmount,
    finalPrice: basePrice - discountAmount,
  };
}

// Промо кодыг шалгаад {ok, promo, error} буцаана. `ok: true` бол `promo` ашиглана.
async function validatePromo(codeRaw) {
  const code = normalizeCode(codeRaw);
  if (!code) {
    return { ok: false, error: "Промо код оруулна уу." };
  }

  const store = getPromoStore();
  const raw = await store.get(code);
  if (!raw) {
    return { ok: false, error: "Промо код олдсонгүй." };
  }

  const promo = JSON.parse(raw);

  if (!promo.active) {
    return { ok: false, error: "Энэ промо код идэвхгүй болсон байна." };
  }
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "Энэ промо кодны хугацаа дууссан байна." };
  }
  if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
    return { ok: false, error: "Энэ промо кодыг ашиглах эрх дууссан байна." };
  }

  return { ok: true, promo };
}

module.exports = { BASE_PRICE, getPromoStore, normalizeCode, computeFinalPrice, validatePromo };

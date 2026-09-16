// netlify/functions/validate-promo.js
//
// ПУБЛИК function. Захиалагч промо кодоо оруулахад дуудагдаж, хямдралтай
// үнийг тооцоолж буцаана. Захиалга ЖИНХЭНЭ баталгаажихдаа (create-order.js)
// энэ кодыг дахин шалгадаг тул энд зөвхөн урьдчилан харуулах зорилготой.
//
// Хүлээн авах (POST JSON): { code }
// Буцаах (200 JSON): { valid: true, code, discountType, discountValue,
//                       basePrice, discountAmount, finalPrice }
//                 эсвэл { valid: false, error }

const { validatePromo, computeFinalPrice } = require("./_promo");

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

  try {
    const result = await validatePromo(body.code);
    if (!result.ok) {
      return respond(200, { valid: false, error: result.error });
    }

    const { basePrice, discountAmount, finalPrice } = computeFinalPrice(result.promo);

    return respond(200, {
      valid: true,
      code: result.promo.code,
      discountType: result.promo.discountType,
      discountValue: result.promo.discountValue,
      basePrice,
      discountAmount,
      finalPrice,
    });
  } catch (err) {
    console.error("validate-promo error:", err);
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

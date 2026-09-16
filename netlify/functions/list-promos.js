// netlify/functions/list-promos.js
//
// Admin-only. Бүх промо кодны жагсаалтыг буцаана.
//
// GET /.netlify/functions/list-promos
// Header: x-admin-pin

const { checkAdminPin } = require("./_admin-auth");
const { getPromoStore } = require("./_promo");

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  try {
    const store = getPromoStore();
    const { blobs } = await store.list();

    const promos = await Promise.all(
      blobs.map(async (b) => {
        try {
          const raw = await store.get(b.key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      })
    );

    const items = promos.filter(Boolean).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return respond(200, { items });
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

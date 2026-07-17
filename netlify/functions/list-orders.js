// netlify/functions/list-orders.js
//
// Admin-only. Бүх захиалгын жагсаалтыг (metadata л) буцаана.
//
// GET /.netlify/functions/list-orders
// Header: x-admin-pin

const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");

function getOrdersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-orders", siteID, token });
  }
  return getStore("pixietale-orders");
}

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) {
    return respond(auth.statusCode, { error: auth.error });
  }

  try {
    const store = getOrdersStore();
    const { blobs } = await store.list();

    const orders = [];
    for (const b of blobs) {
      try {
        const meta = await store.getMetadata(b.key);
        orders.push({ id: b.key, ...(meta && meta.metadata ? meta.metadata : {}) });
      } catch (e) {
        // алгасна
      }
    }

    orders.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return respond(200, { orders });
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

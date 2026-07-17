// netlify/functions/get-order.js
//
// Admin-only. Нэг захиалгын бүрэн мэдээллийг буцаана.
//
// GET /.netlify/functions/get-order?id=xxxx
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

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return respond(400, { error: "id шаардлагатай." });
  }

  try {
    const store = getOrdersStore();
    const raw = await store.get(id);
    if (!raw) {
      return respond(404, { error: "Захиалга олдсонгүй." });
    }
    const order = JSON.parse(raw);
    return respond(200, { order });
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

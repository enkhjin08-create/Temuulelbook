// netlify/functions/track-visit.js
//
// Public. Сайтад орсон өвөрмөц хэрэглэгчийг (browser-ийн санамсаргүй
// visitorId-аар) өдөр бүрээр тоолно. Admin PIN-тэй хүсэлтийг тоолохгүй.
//
// POST JSON: { visitorId }

const { isAdminPinValid } = require("./_admin-auth");
const { getStatsStore, mongoliaDay } = require("./_stats");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST." });
  }
  if (isAdminPinValid(event)) return respond(200, { ok: true });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "JSON биш." });
  }
  const visitorId = String(body.visitorId || "");
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) {
    return respond(400, { error: "visitorId буруу." });
  }

  try {
    const store = getStatsStore();
    await store.set(`v:${mongoliaDay()}:${visitorId}`, new Date().toISOString());
    return respond(200, { ok: true });
  } catch (err) {
    console.error("track-visit error:", err);
    return respond(200, { ok: false });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

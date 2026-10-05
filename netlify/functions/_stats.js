// netlify/functions/_stats.js
//
// Хэрэглээний статистикийн туслах модуль (endpoint биш).
//
// Хадгалах бүтэц ("pixietale-stats" blob store):
//   v:<өдөр>:<visitorId>        — тухайн өдөр сайтад орсон өвөрмөц хэрэглэгч
//   g:<өдөр>:<story|image>:<ip> — тухайн IP-ийн амжилттай generate-ийн тоо
//
// Өдрийг Улаанбаатарын цагаар (UTC+8) тооцно. Rate limit-ээс ялгаатай нь энд
// захиалга баталгаажихад тоо арилдаггүй — статистик бүрэн хадгалагдана.

const { getStore } = require("@netlify/blobs");
const { getClientIp } = require("./_rate-limit");
const { isAdminPinValid } = require("./_admin-auth");

const MN_OFFSET_MS = 8 * 60 * 60 * 1000;

function getStatsStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-stats", siteID, token });
  }
  return getStore("pixietale-stats");
}

// Улаанбаатарын цагаар YYYY-MM-DD
function mongoliaDay(ts = Date.now()) {
  return new Date(ts + MN_OFFSET_MS).toISOString().slice(0, 10);
}

// type: "story" | "image". Алдаа гарвал үндсэн урсгалыг зогсоохгүй.
async function recordGeneration(event, type) {
  try {
    if (isAdminPinValid(event)) return;
    const ip = getClientIp(event);
    const key = `g:${mongoliaDay()}:${type}:${ip}`;
    const store = getStatsStore();
    const raw = await store.get(key);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    await store.set(key, String(count + 1));
  } catch (err) {
    console.error("recordGeneration failed:", err);
  }
}

module.exports = { getStatsStore, mongoliaDay, recordGeneration, MN_OFFSET_MS };

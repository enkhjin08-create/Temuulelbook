// netlify/functions/get-stats.js
//
// Admin-only. Өдөр бүрийн статистик: нийт хандалт (өвөрмөц хүн), түүх/зураг
// generate хийсэн хүн болон тоо, хүн тутмын задаргаа, шинэ захиалга.
//
// GET /.netlify/functions/get-stats?days=14
// Header: x-admin-pin
//
// Статистик бүртгэл эхлэхээс ӨМНӨХ өдрүүдэд хандалтын тоо байхгүй; generate-ийн
// тоог хуучин rate-limit бүртгэлээс сэргээнэ (legacy: true). Тэр бүртгэл нь
// захиалга хийсэн хүмүүсийн хувьд захиалгын үед арилдаг тул дутуу байж болно.

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");
const { checkAdminPin } = require("./_admin-auth");
const { getStatsStore, mongoliaDay, MN_OFFSET_MS } = require("./_stats");

function getRateLimitStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) return getStore({ name: "pixietale-ratelimit", siteID, token });
  return getStore("pixietale-ratelimit");
}

function getOrdersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) return getStore({ name: "pixietale-orders", siteID, token });
  return getStore("pixietale-orders");
}

// IP-г хэсэгчлэн нууцлах боловч өөр өөр IP-г ялгахын тулд бүтэн IP-ийн богино
// "хуруун хээ" (#xxxx) нэмнэ. IPv6-ийн хувьд эхний 4 бүлэг (/64) харуулна —
// ихэнх оператор нэг төхөөрөмжид нэг /64 өгдөг.
function maskIp(ip) {
  const tag = crypto.createHash("sha1").update(ip).digest("hex").slice(0, 4);
  let label;
  if (ip.includes(".")) {
    const p = ip.split(".");
    label = `${p[0]}.${p[1]}.${p[2]}.*`;
  } else {
    label = ip.split(":").slice(0, 4).join(":") + "::*";
  }
  return `${label} #${tag}`;
}

exports.handler = async (event) => {
  const auth = checkAdminPin(event);
  if (!auth.ok) return respond(auth.statusCode, { error: auth.error });

  const daysParam = Math.min(60, Math.max(1, parseInt((event.queryStringParameters || {}).days, 10) || 14));
  const dayList = [];
  for (let i = 0; i < daysParam; i++) dayList.push(mongoliaDay(Date.now() - i * 86400000));

  try {
    const stats = getStatsStore();
    const days = {};
    dayList.forEach((d) => {
      days[d] = { date: d, visitors: 0, orders: 0, people: {}, hasTracked: false, legacy: false };
    });
    const person = (d, ip) => (days[d].people[ip] = days[d].people[ip] || { ip: maskIp(ip), stories: 0, images: 0 });

    // 1) Хандалт — түлхүүрийн тоо л хангалттай
    await Promise.all(dayList.map(async (d) => {
      const { blobs } = await stats.list({ prefix: `v:${d}:` });
      days[d].visitors = blobs.length;
      if (blobs.length) days[d].hasTracked = true;
    }));

    // 2) Generate — шинэ бүртгэл
    await Promise.all(dayList.map(async (d) => {
      const { blobs } = await stats.list({ prefix: `g:${d}:` });
      await Promise.all(blobs.map(async (b) => {
        const [, , type, ...ipParts] = b.key.split(":");
        const ip = ipParts.join(":");
        const raw = await stats.get(b.key);
        const n = raw ? parseInt(raw, 10) || 0 : 0;
        const p = person(d, ip);
        if (type === "story") p.stories += n;
        else if (type === "image") p.images += n;
        days[d].hasTracked = true;
      }));
    }));

    // 3) Хуучин rate-limit бүртгэлээс — зөвхөн шинэ бүртгэлгүй өдрүүдэд
    const rl = getRateLimitStore();
    for (const [fn, field] of [["generate-story", "stories"], ["generate-character", "images"]]) {
      const { blobs } = await rl.list({ prefix: `${fn}:` });
      await Promise.all(blobs.map(async (b) => {
        const rest = b.key.slice(fn.length + 1);
        const d = rest.slice(-10);
        const ip = rest.slice(0, -11);
        if (!days[d] || days[d].hasTracked) return;
        const raw = await rl.get(b.key);
        const n = raw ? parseInt(raw, 10) || 0 : 0;
        person(d, ip)[field] += n;
        days[d].legacy = true;
      }));
    }

    // 4) Захиалга — id нь Date.now()-аар эхэлдэг
    const orders = getOrdersStore();
    const { blobs: orderBlobs } = await orders.list();
    orderBlobs.forEach((b) => {
      const ts = Number(String(b.key).split("-")[0]);
      if (!ts) return;
      const d = mongoliaDay(ts);
      if (days[d]) days[d].orders += 1;
    });

    const result = dayList.map((d) => {
      const x = days[d];
      const people = Object.values(x.people).sort((a, b) => b.images + b.stories - (a.images + a.stories));
      return {
        date: d,
        visitors: x.visitors,
        visitorsTracked: x.hasTracked && x.visitors > 0,
        legacy: x.legacy,
        orders: x.orders,
        storyUsers: people.filter((p) => p.stories > 0).length,
        storyTotal: people.reduce((s, p) => s + p.stories, 0),
        imageUsers: people.filter((p) => p.images > 0).length,
        imageTotal: people.reduce((s, p) => s + p.images, 0),
        people,
      };
    });

    return respond(200, { days: result });
  } catch (err) {
    console.error("get-stats error:", err);
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

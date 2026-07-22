// netlify/functions/_rate-limit.js
//
// IP хаяг тутамд өдөрт хэдэн удаа Gemini дуудаж болохыг хязгаарладаг туслах
// модуль (endpoint биш, зөвхөн require хийгддэг). Сайт public болсны дараа
// хэн ч скрипт бичээд дараалан дуудаж, төлбөр ихээр гаргуулахаас хамгаална.
//
// Зөв ADMIN_PIN header ирвэл хязгаарлалтгүйгээр өнгөрнө (admin.html-ийн
// хэрэглээнд саад болохгүйн тулд).

const { getStore } = require("@netlify/blobs");

function getRateLimitStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-ratelimit", siteID, token });
  }
  return getStore("pixietale-ratelimit");
}

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers["x-nf-client-connection-ip"] ||
    (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown"
  );
}

function isAdminRequest(event) {
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) return false;
  const headers = event.headers || {};
  const providedPin = headers["x-admin-pin"] || headers["X-Admin-Pin"];
  return providedPin === expectedPin;
}

// functionName: түлхүүрт ашиглах нэр (жишээ нь "generate-story")
// limit: тухайн IP-д өдөрт зөвшөөрөх дээд тоо
//
// ЗӨВХӨН шалгана, тоог нэмэгдүүлдэггүй. Амжилттай generate хийсний ДАРАА
// incrementRateLimit-ийг тусад нь дуудна — ингэснээр Gemini алдаа буцаасан
// (503 гэх мэт) амжилтгүй оролдлого хэрэглэгчийн өдрийн хязгаарт тооцогдохгүй.
async function checkRateLimit(event, functionName, limit) {
  if (isAdminRequest(event)) {
    return { allowed: true };
  }

  const ip = getClientIp(event);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `${functionName}:${ip}:${today}`;

  try {
    const store = getRateLimitStore();
    const raw = await store.get(key);
    const count = raw ? parseInt(raw, 10) || 0 : 0;

    if (count >= limit) {
      return { allowed: false };
    }
    return { allowed: true };
  } catch (err) {
    // Rate limit сан өөрөө алдаа гаргавал, хэрэглэгчийг блоклохгүйгээр
    // өнгөрүүлнэ (хэт хатуу хориглохоос сайн туршлагыг илүүд үзнэ)
    console.error("Rate limit check failed:", err);
    return { allowed: true };
  }
}

// Амжилттай generate хийсний дараа л дуудаж, тоог нэгээр нэмэгдүүлнэ
async function incrementRateLimit(event, functionName) {
  if (isAdminRequest(event)) return;

  const ip = getClientIp(event);
  const today = new Date().toISOString().slice(0, 10);
  const key = `${functionName}:${ip}:${today}`;

  try {
    const store = getRateLimitStore();
    const raw = await store.get(key);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    await store.set(key, String(count + 1));
  } catch (err) {
    console.error("Rate limit increment failed:", err);
  }
}

// Захиалга амжилттай баталгаажсаны дараа тухайн хэрэглэгчийн хязгаарыг
// цэвэрлэж, дараагийн захиалгаа шинэ хязгаартайгаар эхлүүлэх боломж өгнө.
async function resetRateLimit(event, functionName) {
  const ip = getClientIp(event);
  const today = new Date().toISOString().slice(0, 10);
  const key = `${functionName}:${ip}:${today}`;

  try {
    const store = getRateLimitStore();
    await store.delete(key);
  } catch (err) {
    console.error("Rate limit reset failed:", err);
  }
}

module.exports = { checkRateLimit, incrementRateLimit, resetRateLimit, getClientIp };

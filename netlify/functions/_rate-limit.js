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

    await store.set(key, String(count + 1));
    return { allowed: true };
  } catch (err) {
    // Rate limit сан өөрөө алдаа гаргавал, хэрэглэгчийг блоклохгүйгээр
    // өнгөрүүлнэ (хэт хатуу хориглохоос сайн туршлагыг илүүд үзнэ)
    console.error("Rate limit check failed:", err);
    return { allowed: true };
  }
}

module.exports = { checkRateLimit, getClientIp };

// netlify/functions/_idempotency.js
//
// Client-ийн timeout/retry-гаас болж, сервер дээр хараахан дуусаагүй байтал
// ижил хүсэлтийг ХОЁР ДАХЬ УДАА Gemini рүү дуудахаас сэргийлдэг туслах модуль.
// Client requestId (нэг логик оролдлого бүрд ижил байдаг, HTTP retry бүрт
// дахин үүсгэгддэггүй) дамжуулж ирвэл ашиглана.

const { getStore } = require("@netlify/blobs");

function getIdempotencyStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-idempotency", siteID, token });
  }
  return getStore("pixietale-idempotency");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// requestId байхгүй бол хамгаалалтгүйгээр үргэлжилнэ (хуучин client-үүдтэй
// нийцтэй байхын тулд).
//
// Буцаах утга:
//   { proceed: true }                — шинээр Gemini дуудаж болно
//   { proceed: false, cached: {...} } — өмнөх үр дүнг шууд ашиглана
async function claimOrWaitForRequest(requestId, maxWaitMs = 20000) {
  if (!requestId) return { proceed: true };

  const store = getIdempotencyStore();

  try {
    const raw = await store.get(requestId);
    if (raw) {
      const existing = JSON.parse(raw);
      if (existing.status === "done") {
        return { proceed: false, cached: existing.result };
      }
      if (existing.status === "in-progress") {
        // Өмнөх (эсвэл зэрэгцээ) оролдлого аль хэдийн боловсруулж эхэлсэн тул,
        // үр дүнг нь хүлээнэ (дахин Gemini дуудахгүй)
        const pollIntervalMs = 1500;
        let waited = 0;
        while (waited < maxWaitMs) {
          await sleep(pollIntervalMs);
          waited += pollIntervalMs;
          const raw2 = await store.get(requestId);
          if (raw2) {
            const data2 = JSON.parse(raw2);
            if (data2.status === "done") {
              return { proceed: false, cached: data2.result };
            }
            if (data2.status === "error") {
              break; // алдаатай дуусвал доор дахин Gemini дуудахыг зөвшөөрнө
            }
          }
        }
      }
    }

    await store.set(requestId, JSON.stringify({ status: "in-progress" }));
    return { proceed: true };
  } catch (err) {
    console.error("Idempotency check failed:", err);
    return { proceed: true }; // хамгаалалт өөрөө эвдэрвэл хэрэглэгчийг блоклохгүй
  }
}

async function markDone(requestId, result) {
  if (!requestId) return;
  try {
    const store = getIdempotencyStore();
    await store.set(requestId, JSON.stringify({ status: "done", result }));
  } catch (err) {
    console.error("Idempotency markDone failed:", err);
  }
}

async function markError(requestId) {
  if (!requestId) return;
  try {
    const store = getIdempotencyStore();
    await store.set(requestId, JSON.stringify({ status: "error" }));
  } catch (err) {
    console.error("Idempotency markError failed:", err);
  }
}

module.exports = { claimOrWaitForRequest, markDone, markError };

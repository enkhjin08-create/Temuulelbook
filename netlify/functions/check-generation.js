// netlify/functions/check-generation.js
//
// Client 2 секунд тутам энэ функцийг дуудаж, jobId-гийнхаа явцыг шалгана.
//
// GET /.netlify/functions/check-generation?jobId=xxxx
//
// Буцаах JSON:
//   { status: "pending" }
//   { status: "done", imageBase64: "..." }
//   { status: "error", error: "...", detail: "..." }

const { getStore } = require("@netlify/blobs");

function getJobsStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-jobs", siteID, token });
  }
  return getStore("pixietale-jobs");
}

exports.handler = async (event) => {
  const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
  if (!jobId) {
    return respond(400, { error: "jobId шаардлагатай." });
  }

  const store = getJobsStore();

  // Диагностик шалгалт: Blobs сан бодитоор бичиж/уншиж чадаж байгаа эсэхийг
  // энэ функцийн лог руу бичнэ (учир нь background function-ы лог харагддаггүй,
  // харин энэ функцийн лог харагддаг тул үүгээр дамжуулж шалгаж байна).
  try {
    const testKey = `healthcheck-${jobId}`;
    await store.set(testKey, "ok");
    const readBack = await store.get(testKey);
    console.log(`[BLOBS HEALTHCHECK] write/read ${readBack === "ok" ? "SUCCESS" : "MISMATCH: " + readBack}`);
  } catch (healthErr) {
    console.log(`[BLOBS HEALTHCHECK] FAILED: ${String(healthErr && healthErr.message ? healthErr.message : healthErr)}`);
  }

  try {
    const data = await store.get(jobId, { type: "json" });
    console.log(`[JOB STATUS] jobId=${jobId} data=${JSON.stringify(data)}`);
    if (!data) {
      // background function хараахан бичиж эхлээгүй байж болно
      return respond(200, { status: "pending" });
    }
    return respond(200, data);
  } catch (err) {
    console.log(`[CHECK ERROR] ${String(err && err.message ? err.message : err)}`);
    return respond(500, { status: "error", error: String(err && err.message ? err.message : err) });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

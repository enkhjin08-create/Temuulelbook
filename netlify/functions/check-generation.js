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

exports.handler = async (event) => {
  const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
  if (!jobId) {
    return respond(400, { error: "jobId шаардлагатай." });
  }

  const store = getStore("pixietale-jobs");

  try {
    const data = await store.get(jobId, { type: "json" });
    if (!data) {
      // background function хараахан бичиж эхлээгүй байж болно
      return respond(200, { status: "pending" });
    }
    return respond(200, data);
  } catch (err) {
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

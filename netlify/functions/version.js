// netlify/functions/version.js
//
// ПУБЛИК function. Netlify-ийн deploy-тай холбоотой мэдээллийг (commit,
// deploy id, context) буцаана — admin.html дээр "хувилбар" харуулахад
// ашиглагдана.
//
// GET /.netlify/functions/version

exports.handler = async () => {
  const commitRef = process.env.COMMIT_REF || "";
  const deployId = process.env.DEPLOY_ID || "";
  const context = process.env.CONTEXT || "";
  const branch = process.env.BRANCH || "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commit: commitRef ? commitRef.slice(0, 7) : "тодорхойгүй",
      deployId: deployId || "тодорхойгүй",
      context: context || "тодорхойгүй",
      branch: branch || "тодорхойгүй",
    }),
  };
};

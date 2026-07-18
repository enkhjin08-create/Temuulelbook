// netlify/functions/me.js
//
// Клиент хуудсаа шинээр ачаалахад, өмнө нь хадгалсан session token хараахан
// хүчинтэй эсэхийг шалгахад ашиглана.
//
// GET /.netlify/functions/me
// Header: x-auth-token

const { checkSession } = require("./_auth");

exports.handler = async (event) => {
  const session = await checkSession(event);
  if (!session.ok) {
    return respond(401, { error: "Нэвтрээгүй байна." });
  }
  return respond(200, { email: session.email });
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

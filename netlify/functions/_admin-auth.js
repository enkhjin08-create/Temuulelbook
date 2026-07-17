// netlify/functions/_admin-auth.js
//
// Admin-only function бүрт ашиглагдах энгийн PIN шалгагч. Энэ файл өөрөө
// endpoint биш (exports.handler байхгүй тул Netlify үүнийг function болгож
// deploy хийхгүй), зөвхөн бусад function-уудад require хийгддэг helper.

function checkAdminPin(event) {
  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) {
    return { ok: false, statusCode: 500, error: "Серверт ADMIN_PIN тохируулаагүй байна." };
  }

  const providedPin = event.headers && (event.headers["x-admin-pin"] || event.headers["X-Admin-Pin"]);
  if (!providedPin || providedPin !== expectedPin) {
    return { ok: false, statusCode: 401, error: "PIN буруу байна." };
  }

  return { ok: true };
}

module.exports = { checkAdminPin };

// netlify/functions/_email.js
//
// Resend-ээр имэйл илгээдэг туслах модуль. Энэ файл өөрөө endpoint биш.
// RESEND_API_KEY орчны хувьсагч заавал хэрэгтэй.

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY тохируулаагүй байна, имэйл илгээгдсэнгүй.");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Зөвхөн Түүнд <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error:", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

module.exports = { sendEmail };

// netlify/functions/create-order.js
//
// Захиалагч эхний хуудсаа хараад таалагдаад захиалга өгөхөд дуудагдана.
// Энэ бол ПУБЛИК function (нэвтрэлт шаардахгүй), учир нь ямар ч захиалагч
// захиалга өгч чадах ёстой — admin функцүүд шиг PIN шаардахгүй.
//
// Хүлээн авах (POST JSON):
//   { childName, gender, age, interests, storyTitle, storyPages,
//     photoBase64, firstPageImageBase64, contactPhone, contactNote }
//
// Буцаах (200 JSON): { id }

const { getStore } = require("@netlify/blobs");

const PRICE = 120000;

function getOrdersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-orders", siteID, token });
  }
  return getStore("pixietale-orders");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Зөвхөн POST хүсэлт хүлээн авна." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return respond(400, { error: "Хүсэлтийн бүтэц буруу байна (JSON биш)." });
  }

  const {
    childName, gender, age, interests, storyTitle, storyPages,
    photoBase64, firstPageImageBase64, contactPhone, contactNote,
  } = body;

  if (!childName || typeof childName !== "string") {
    return respond(400, { error: "Хүүхдийн нэр дутуу байна." });
  }
  if (!Array.isArray(storyPages) || storyPages.length === 0) {
    return respond(400, { error: "Түүхийн хуудсууд дутуу байна." });
  }
  if (!firstPageImageBase64) {
    return respond(400, { error: "Эхний хуудасны зураг дутуу байна." });
  }
  if (!contactPhone || typeof contactPhone !== "string") {
    return respond(400, { error: "Утасны дугаар оруулна уу." });
  }

  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const order = {
      id,
      childName,
      gender: gender || "",
      age: age || "",
      interests: interests || "",
      storyTitle: storyTitle || "",
      storyPages,
      photoBase64: photoBase64 || "",
      generatedPages: [
        { pageIndex: 0, imageBase64: firstPageImageBase64, caption: storyPages[0].caption || "" },
      ],
      contactPhone,
      contactNote: contactNote || "",
      status: "new",
      price: PRICE,
      createdAt: now,
      updatedAt: now,
    };

    const store = getOrdersStore();
    await store.set(id, JSON.stringify(order), {
      metadata: {
        childName,
        status: order.status,
        createdAt: now,
        updatedAt: now,
        totalPages: storyPages.length,
        pageCount: 1,
        contactPhone,
        price: PRICE,
      },
    });

    return respond(200, { id });
  } catch (err) {
    console.error("create-order error:", err);
    return respond(500, {
      error: "Захиалга хадгалахад алдаа гарлаа.",
      detail: String(err && err.message ? err.message : err),
    });
  }
};

function respond(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

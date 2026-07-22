// netlify/functions/_order-images.js
//
// Захиалгын зургуудыг (эх зураг, generate хийсэн хуудас бүр) тусад нь
// Blobs-д хадгалж, захиалгын JSON дотор зөвхөн жижиг "key" л үлдээдэг
// туслах модуль. Ингэснээр захиалгын JSON хэт томорч, Lambda-ийн 6MB
// хариултын хязгаарт хүрэхээс сэргийлнэ.

const { getStore } = require("@netlify/blobs");

function getOrderImagesStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-order-images", siteID, token });
  }
  return getStore("pixietale-order-images");
}

// dataUrl: "data:image/png;base64,...." хэлбэрийн бүтэн зураг
// key: жишээ нь "{orderId}:page0" эсвэл "{orderId}:original"
async function saveOrderImage(key, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const rawBase64 = match ? match[2] : dataUrl;

  const store = getOrderImagesStore();
  await store.set(key, rawBase64, { metadata: { mimeType } });
  return key;
}

module.exports = { getOrderImagesStore, saveOrderImage };

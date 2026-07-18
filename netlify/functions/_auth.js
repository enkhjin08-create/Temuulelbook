// netlify/functions/_auth.js
//
// Нэвтрэлттэй холбоотой туслах функцууд. Энэ файл өөрөө endpoint биш.
// Нууц үгийг Node-ийн built-in crypto.scrypt-ээр hash хийдэг тул нэмэлт
// package (bcrypt гэх мэт) шаардахгүй — өмнө нь SDK package bundling
// асуудалтай тулгарсан туршлагаас сургамж авч, аль болох цөөн dependency
// ашиглаж байна.

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 хоног

function getUsersStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-users", siteID, token });
  }
  return getStore("pixietale-users");
}

function getSessionsStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: "pixietale-sessions", siteID, token });
  }
  return getStore("pixietale-sessions");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  // тогтмол хугацаатай харьцуулалт (timing attack-аас сэргийлнэ)
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createSession(email) {
  const store = getSessionsStore();
  const token = generateToken();
  const now = Date.now();
  await store.set(token, JSON.stringify({ email, createdAt: now, expiresAt: now + SESSION_TTL_MS }));
  return token;
}

async function checkSession(event) {
  const headers = event.headers || {};
  const token = headers["x-auth-token"] || headers["X-Auth-Token"];
  if (!token) return { ok: false };

  try {
    const store = getSessionsStore();
    const raw = await store.get(token);
    if (!raw) return { ok: false };
    const session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) return { ok: false };
    return { ok: true, email: session.email };
  } catch (e) {
    return { ok: false };
  }
}

module.exports = {
  getUsersStore,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  verifyPassword,
  createSession,
  checkSession,
};

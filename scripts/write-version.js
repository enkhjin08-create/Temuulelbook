// scripts/write-version.js
//
// Netlify build хийх ЯВЦАД (Functions runtime-д БИШ) ажилладаг тул,
// COMMIT_REF гэх мэт орчны хувьсагчид зөвхөн энд л боломжтой. Тэдгээрийг
// static version.json файл болгож бичээд, admin.html шууд fetch хийдэг.

const fs = require("fs");
const path = require("path");

const info = {
  commit: (process.env.COMMIT_REF || "").slice(0, 7) || "тодорхойгүй",
  context: process.env.CONTEXT || "тодорхойгүй",
  branch: process.env.BRANCH || "тодорхойгүй",
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(path.join(__dirname, "..", "version.json"), JSON.stringify(info));
console.log("Wrote version.json:", info);

const uploadBox = document.getElementById("uploadBox");
const photoInput = document.getElementById("photoInput");
const uploadEmpty = document.getElementById("uploadEmpty");
const uploadPreview = document.getElementById("uploadPreview");
const uploadConfirm = document.getElementById("uploadConfirm");

const genForm = document.getElementById("genForm");
const generateBtn = document.getElementById("generateBtn");
const childNameInput = document.getElementById("childName");
const childAgeInput = document.getElementById("childAge");
const childGenderInput = document.getElementById("childGender");
const childInterestsInput = document.getElementById("childInterests");

const storyTitleEl = document.getElementById("storyTitle");
const storySubtitleEl = document.getElementById("storySubtitle");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultLoading = document.getElementById("resultLoading");
const resultError = document.getElementById("resultError");
const resultStoryReady = document.getElementById("resultStoryReady");
const resultPair = document.getElementById("resultPair");
const errorDetail = document.getElementById("errorDetail");
const retryBtn = document.getElementById("retryBtn");

const storyOutlineEl = document.getElementById("storyOutline");
const approveBtn = document.getElementById("approveBtn");

const originalImg = document.getElementById("originalImg");
const generatedImg = document.getElementById("generatedImg");
const generatedCaption = document.getElementById("generatedCaption");

const loadingText = document.getElementById("loadingText");

const orderCtaArea = document.getElementById("orderCtaArea");
const pageEditArea = document.getElementById("pageEditArea");
const editTextToggleBtn = document.getElementById("editTextToggleBtn");
const pageEditBox = document.getElementById("pageEditBox");
const pageEditTextarea = document.getElementById("pageEditTextarea");
const regenerateBtn = document.getElementById("regenerateBtn");
const orderCtaBtn = document.getElementById("orderCtaBtn");
const orderForm = document.getElementById("orderForm");
const orderPhoneInput = document.getElementById("orderPhone");
const orderAddressInput = document.getElementById("orderAddress");
const orderNoteInput = document.getElementById("orderNote");
const orderSubmitBtn = document.getElementById("orderSubmitBtn");
const orderDone = document.getElementById("orderDone");
const orderNumberEl = document.getElementById("orderNumberDisplay");
const claimPaidBtn = document.getElementById("claimPaidBtn");
const claimPaidNote = document.getElementById("claimPaidNote");

// ---------- auth ----------
const landingSection = document.getElementById("landingSection");
const appSection = document.getElementById("appSection");
const authStatus = document.getElementById("authStatus");
const userEmailLabel = document.getElementById("userEmailLabel");
const logoutBtn = document.getElementById("logoutBtn");

const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginError = document.getElementById("loginError");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
const signupError = document.getElementById("signupError");
const signupPending = document.getElementById("signupPending");
const verifyStatus = document.getElementById("verifyStatus");
const authTabs = document.getElementById("authTabs");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotEmailInput = document.getElementById("forgotEmail");
const forgotSubmitBtn = document.getElementById("forgotSubmitBtn");
const forgotError = document.getElementById("forgotError");
const forgotPending = document.getElementById("forgotPending");
const backToLoginLink = document.getElementById("backToLoginLink");

const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetNewPasswordInput = document.getElementById("resetNewPassword");
const resetSubmitBtn = document.getElementById("resetSubmitBtn");
const resetError = document.getElementById("resetError");

let authToken = localStorage.getItem("ztAuthToken") || null;
let authEmail = localStorage.getItem("ztAuthEmail") || null;

let photoDataUrl = null;

// Түүхийн явцын төлөв
let currentChildName = null;
let currentGender = null;
let currentAge = null;
let currentInterests = null;
let currentStoryTitle = null;
let storyPages = []; // [{ caption, sceneDescription }, ...]
let firstPageImageBase64 = null;
let currentOrderId = null;
let lastAttempt = null; // { type: "story", ... } | { type: "page0" }

// ---------- photo upload ----------

uploadBox.addEventListener("click", () => photoInput.click());

uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox.classList.add("dragover");
});
uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("dragover");
});
uploadBox.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox.classList.remove("dragover");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Зөвхөн зургийн файл сонгоно уу (JPG, PNG, WEBP).");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    resizeImage(reader.result, 1024, 0.85, (resizedDataUrl) => {
      photoDataUrl = resizedDataUrl;
      uploadPreview.src = photoDataUrl;
      uploadPreview.hidden = false;
      uploadEmpty.hidden = true;
      uploadConfirm.hidden = false;
    });
  };
  reader.onerror = () => {
    alert("Зургийг уншихад алдаа гарлаа. Дахин сонгож үзнэ үү.");
  };
  reader.readAsDataURL(file);
}

// Зургийг дээд тал нь maxDim пиксель урттай, JPEG хэлбэрт хувиргаж хэмжээг
// эрс багасгана. Ингэснээр илгээх дата хөнгөн болж, Netlify function руу
// хурдан хүрч, хугацааны болон хэмжээний хязгаарт баригдахгүй.
function resizeImage(dataUrl, maxDim, quality, callback) {
  const img = new Image();
  img.onload = () => {
    let { width, height } = img;
    if (width > height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL("image/jpeg", quality));
  };
  img.onerror = () => {
    callback(dataUrl);
  };
  img.src = dataUrl;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Нэг логик "оролдлого" (form submit эсвэл товч дарах) бүрт ганц удаа
// үүсгэгддэг ID. Дотоод автомат retry (fetchJsonWithRetry) бүрд ижил ID-г
// ашигладаг тул, сервер өмнөх (хараахан дуусаагүй) хүсэлтийг таньж, давхар
// Gemini дуудахаас сэргийлдэг.
function generateRequestId() {
  return crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Захиалагч захиалахаас өмнө generate хийсэн зургаа өөр зориулалтаар (жишээ
// нь профайл зураг болгож) ашиглахаас сэргийлж, дэлгэц дээр харагдах хувилбар
// дээр л watermark хийнэ. Захиалгад илгээгдэх (firstPageImageBase64) хувилбар
// цэвэр хэвээр үлддэг тул захиалсны дараа таны бэлдэх номонд watermark орохгүй.
function addWatermark(dataUrl, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#2E2247";
    ctx.font = `bold ${Math.round(canvas.width * 0.05)}px "Baloo 2", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 6);

    const text = "ЗӨВХӨН ТҮҮНД · ЗАГВАР";
    const stepY = canvas.height * 0.24;
    const stepX = canvas.width * 0.75;
    for (let y = -canvas.height; y < canvas.height * 1.5; y += stepY) {
      for (let x = -canvas.width; x < canvas.width * 1.5; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();

    callback(canvas.toDataURL("image/jpeg", 0.92));
  };
  img.onerror = () => {
    callback(dataUrl); // watermark хийж чадахгүй бол эх зургийг харуулна
  };
  img.src = dataUrl;
}

// ---------- сүлжээ/сервер талын түр зуурын алдааг автоматаар дахин оролддог fetch ----------
async function fetchJsonWithRetry(url, options, { maxRetries = 5, retryDelayMs = 3000, timeoutMs = 29000, onRetry } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res = null;
    let networkErr = null;
    let aborted = false;

    try {
      res = await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === "AbortError") aborted = true;
      else networkErr = err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (aborted || networkErr) {
      if (attempt < maxRetries) {
        if (onRetry) onRetry(attempt, maxRetries);
        await sleep(retryDelayMs * attempt);
        continue;
      }
      throw new Error(aborted ? "Хугацаа хэтэрлээ. Дахин оролдоно уу." : `Сүлжээний алдаа: ${networkErr.message}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      if (attempt < maxRetries) {
        if (onRetry) onRetry(attempt, maxRetries);
        await sleep(retryDelayMs * attempt);
        continue;
      }
      throw new Error(`Серверийн хариу уншигдсангүй (${res.status}).`);
    }

    if (res.ok) return data;

    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < maxRetries) {
      if (onRetry) onRetry(attempt, maxRetries);
      await sleep(retryDelayMs * attempt);
      continue;
    }

    const detail = data.detail ? ` — ${data.detail}` : "";
    throw new Error((data.error || "Тодорхойгүй алдаа гарлаа.") + detail);
  }
}

// ---------- form submit ----------

genForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const childName = childNameInput.value.trim();
  const age = childAgeInput.value.trim();
  const gender = childGenderInput.value;
  const interests = childInterestsInput.value.trim();

  if (!childName) { childNameInput.focus(); return; }
  if (!age) { childAgeInput.focus(); return; }
  if (!gender) { childGenderInput.focus(); return; }
  if (!interests) { childInterestsInput.focus(); return; }
  if (!photoDataUrl) {
    alert("Эхлээд хүүхдийн зургаа оруулна уу.");
    return;
  }

  currentChildName = childName;
  currentGender = gender;
  currentAge = age;
  currentInterests = interests;
  storyPages = [];
  firstPageImageBase64 = null;

  await composeStory(childName, age, gender, interests);
});

retryBtn.addEventListener("click", () => {
  if (!lastAttempt) return;
  if (lastAttempt.type === "story") {
    composeStory(lastAttempt.childName, lastAttempt.age, lastAttempt.gender, lastAttempt.interests);
  } else if (lastAttempt.type === "page0") {
    generateFirstPage();
  }
});

approveBtn.addEventListener("click", () => {
  generateFirstPage();
});

orderCtaBtn.addEventListener("click", () => {
  orderCtaArea.hidden = true;
  orderForm.hidden = false;
});

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const phone = orderPhoneInput.value.trim();
  if (!phone) { orderPhoneInput.focus(); return; }

  const address = orderAddressInput.value.trim();
  if (!address) { orderAddressInput.focus(); return; }

  orderSubmitBtn.disabled = true;
  orderSubmitBtn.textContent = "Илгээж байна…";

  try {
    const orderResult = await fetchJsonWithRetry("/.netlify/functions/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({
        childName: currentChildName,
        gender: currentGender,
        age: currentAge,
        interests: currentInterests,
        storyTitle: currentStoryTitle,
        storyPages,
        photoBase64: photoDataUrl,
        firstPageImageBase64,
        contactPhone: phone,
        contactAddress: address,
        contactNote: orderNoteInput.value.trim(),
      }),
    });

    orderNumberEl.textContent = orderResult.orderNumber || "";
    currentOrderId = orderResult.id;
    claimPaidBtn.hidden = false;
    claimPaidBtn.disabled = false;
    claimPaidNote.hidden = true;
    orderForm.hidden = true;
    orderDone.hidden = false;
  } catch (err) {
    alert(`Захиалга илгээхэд алдаа гарлаа: ${err.message}`);
  } finally {
    orderSubmitBtn.disabled = false;
    orderSubmitBtn.textContent = "Захиалга баталгаажуулах";
  }
});

claimPaidBtn.addEventListener("click", async () => {
  if (!currentOrderId) return;
  claimPaidBtn.disabled = true;
  claimPaidBtn.textContent = "Илгээж байна…";

  try {
    const res = await fetch("/.netlify/functions/claim-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": authToken },
      body: JSON.stringify({ orderId: currentOrderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Алдаа гарлаа.");
    }
    claimPaidBtn.hidden = true;
    claimPaidNote.hidden = false;
  } catch (err) {
    alert(`Алдаа гарлаа: ${err.message}`);
    claimPaidBtn.disabled = false;
    claimPaidBtn.textContent = "✓ Би төлбөр төлсөн";
  }
});

// ---------- 1) түүхийн тойм зохиох ----------

async function composeStory(childName, age, gender, interests) {
  lastAttempt = { type: "story", childName, age, gender, interests };

  setState("loading");
  generateBtn.disabled = true;
  loadingText.textContent = "Үлгэрээ зохиож байна…";

  const requestId = generateRequestId();

  try {
    const data = await fetchJsonWithRetry(
      "/.netlify/functions/generate-story",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": authToken },
        body: JSON.stringify({ childName, age, gender, interests, requestId }),
      },
      {
        onRetry: (attempt, max) => {
          loadingText.textContent = `Дахин оролдож байна… (${attempt}/${max})`;
        },
      }
    );

    storyPages = data.pages;
    currentStoryTitle = data.title;
    renderStoryCard(data.title, storyPages.length);
    renderOutline(storyPages);

    setState("story-ready");
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    generateBtn.disabled = false;
  }
}

function renderStoryCard(title, pageCount) {
  storyTitleEl.textContent = title;
  storySubtitleEl.textContent = `${pageCount} хуудас түүх бэлэн боллоо`;
}

function renderOutline(pages) {
  storyOutlineEl.innerHTML = "";
  pages.forEach((p, i) => {
    const li = document.createElement("li");

    const textarea = document.createElement("textarea");
    textarea.className = "outline-textarea";
    textarea.rows = 2;
    textarea.value = p.caption;
    textarea.addEventListener("input", () => {
      pages[i].caption = textarea.value;
      // Зурах prompt-д ашиглагдах текстийг мөн шинэчилнэ, ингэснээр
      // засварласан агуулга нь бодит зурган дээр тусна
      pages[i].sceneDescription = textarea.value;
    });

    li.appendChild(textarea);
    storyOutlineEl.appendChild(li);
  });
}

// ---------- 2) зөвхөн эхний хуудсыг зурах ----------

async function generateFirstPage() {
  lastAttempt = { type: "page0" };

  setState("loading");
  approveBtn.disabled = true;
  loadingText.textContent = "1-р хуудсыг зурж байна…";

  const requestId = generateRequestId();

  try {
    const data = await fetchJsonWithRetry(
      "/.netlify/functions/generate-character",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": authToken },
        body: JSON.stringify({
          childName: currentChildName,
          gender: currentGender,
          photoBase64: photoDataUrl,
          pageIndex: 0,
          totalPages: storyPages.length,
          sceneDescription: storyPages[0].sceneDescription,
          requestId,
        }),
      },
      {
        onRetry: (attempt, max) => {
          loadingText.textContent = `Дахин оролдож байна… (${attempt}/${max})`;
        },
      }
    );

    firstPageImageBase64 = data.imageBase64; // цэвэр хувилбар — захиалгад ашиглагдана

    originalImg.src = photoDataUrl;
    addWatermark(data.imageBase64, (watermarked) => {
      generatedImg.src = watermarked;
    });
    generatedCaption.textContent = storyPages[0].caption || "1-р хуудас";

    setState("result");
    orderCtaArea.hidden = false;
    pageEditArea.hidden = false;
    pageEditBox.hidden = true;
    pageEditTextarea.value = storyPages[0].caption;
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    approveBtn.disabled = false;
    regenerateBtn.disabled = false;
  }
}

editTextToggleBtn.addEventListener("click", () => {
  pageEditBox.hidden = !pageEditBox.hidden;
});

regenerateBtn.addEventListener("click", async () => {
  const newText = pageEditTextarea.value.trim();
  if (!newText) return;
  storyPages[0].caption = newText;
  storyPages[0].sceneDescription = newText;
  regenerateBtn.disabled = true;
  regenerateBtn.textContent = "Зурж байна…";
  await generateFirstPage();
  regenerateBtn.textContent = "🔄 Шинэчилж зурах";
});

function setState(state) {
  resultPlaceholder.hidden = state !== "placeholder";
  resultLoading.hidden = state !== "loading";
  resultError.hidden = state !== "error";
  resultStoryReady.hidden = state !== "story-ready";
  resultPair.hidden = state !== "result";

  if (state !== "result") {
    orderCtaArea.hidden = true;
    orderForm.hidden = true;
    orderDone.hidden = true;
    pageEditArea.hidden = true;
  }
}

// ================= AUTH =================

function showApp(email) {
  authEmail = email;
  landingSection.hidden = true;
  appSection.hidden = false;
  authStatus.hidden = false;
  userEmailLabel.textContent = email;
}

function showLanding() {
  authToken = null;
  authEmail = null;
  localStorage.removeItem("ztAuthToken");
  localStorage.removeItem("ztAuthEmail");
  landingSection.hidden = false;
  appSection.hidden = true;
  authStatus.hidden = true;
}

function hideAllAuthPanels() {
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  signupPending.hidden = true;
  forgotPasswordForm.hidden = true;
  forgotPending.hidden = true;
  resetPasswordForm.hidden = true;
  verifyStatus.hidden = true;
}

async function checkExistingSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = urlParams.get("verify");
  const resetToken = urlParams.get("reset");

  // Нууц үг сэргээх холбоос дээр дарж ирсэн эсэхийг шалгана
  if (resetToken) {
    hideAllAuthPanels();
    resetPasswordForm.hidden = false;
    resetPasswordForm.dataset.token = resetToken;
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

  // Имэйл дэх баталгаажуулах холбоос дээр дарж ирсэн эсэхийг эхлээд шалгана
  if (verifyToken) {
    hideAllAuthPanels();
    verifyStatus.hidden = false;
    verifyStatus.className = "verify-status verify-loading";
    verifyStatus.textContent = "И-мэйлээ баталгаажуулж байна…";

    // URL-аас token-ыг арилгана (дахин refresh хийхэд дахин ашиглагдахгүй)
    window.history.replaceState({}, "", window.location.pathname);

    try {
      const res = await fetch(`/.netlify/functions/verify-email?token=${encodeURIComponent(verifyToken)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Баталгаажуулахад алдаа гарлаа.");
      }
      authToken = data.token;
      localStorage.setItem("ztAuthToken", authToken);
      localStorage.setItem("ztAuthEmail", data.email);
      showApp(data.email);
      return;
    } catch (err) {
      verifyStatus.className = "verify-status verify-error";
      verifyStatus.textContent = err.message;
      authTabs.hidden = false;
      loginForm.hidden = false;
      return;
    }
  }

  if (!authToken) {
    showLanding();
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    let res;
    try {
      res = await fetch("/.netlify/functions/me", {
        headers: { "x-auth-token": authToken },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (res.ok) {
      const data = await res.json();
      showApp(data.email);
    } else {
      showLanding();
    }
  } catch (e) {
    showLanding();
  }
}

checkExistingSession();

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  hideAllAuthPanels();
  authTabs.hidden = false;
  loginForm.hidden = false;
});

tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  hideAllAuthPanels();
  authTabs.hidden = false;
  signupForm.hidden = false;
});

forgotPasswordLink.addEventListener("click", () => {
  hideAllAuthPanels();
  forgotPasswordForm.hidden = false;
});

backToLoginLink.addEventListener("click", () => {
  hideAllAuthPanels();
  authTabs.hidden = false;
  loginForm.hidden = false;
});

forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  forgotError.hidden = true;
  forgotSubmitBtn.disabled = true;

  try {
    const res = await fetch("/.netlify/functions/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmailInput.value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Алдаа гарлаа.");
    }
    forgotPasswordForm.hidden = true;
    forgotPending.hidden = false;
  } catch (err) {
    forgotError.textContent = err.message;
    forgotError.hidden = false;
  } finally {
    forgotSubmitBtn.disabled = false;
  }
});

resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetError.hidden = true;
  resetSubmitBtn.disabled = true;

  try {
    const res = await fetch("/.netlify/functions/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetPasswordForm.dataset.token,
        newPassword: resetNewPasswordInput.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Алдаа гарлаа.");
    }
    authToken = data.token;
    localStorage.setItem("ztAuthToken", authToken);
    localStorage.setItem("ztAuthEmail", data.email);
    showApp(data.email);
  } catch (err) {
    resetError.textContent = err.message;
    resetError.hidden = false;
  } finally {
    resetSubmitBtn.disabled = false;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginSubmitBtn.disabled = true;

  try {
    const res = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmailInput.value.trim(),
        password: loginPasswordInput.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Нэвтрэхэд алдаа гарлаа.");
    }
    authToken = data.token;
    localStorage.setItem("ztAuthToken", authToken);
    localStorage.setItem("ztAuthEmail", data.email);
    showApp(data.email);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  } finally {
    loginSubmitBtn.disabled = false;
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.hidden = true;
  signupSubmitBtn.disabled = true;

  try {
    const res = await fetch("/.netlify/functions/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: signupEmailInput.value.trim(),
        password: signupPasswordInput.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Бүртгүүлэхэд алдаа гарлаа.");
    }
    signupForm.hidden = true;
    authTabs.hidden = true;
    signupPending.hidden = false;
  } catch (err) {
    signupError.textContent = err.message;
    signupError.hidden = false;
  } finally {
    signupSubmitBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  showLanding();
});

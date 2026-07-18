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
const orderCtaBtn = document.getElementById("orderCtaBtn");
const orderForm = document.getElementById("orderForm");
const orderPhoneInput = document.getElementById("orderPhone");
const orderNoteInput = document.getElementById("orderNote");
const orderSubmitBtn = document.getElementById("orderSubmitBtn");
const orderDone = document.getElementById("orderDone");

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

  orderSubmitBtn.disabled = true;
  orderSubmitBtn.textContent = "Илгээж байна…";

  try {
    await fetchJsonWithRetry("/.netlify/functions/create-order", {
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
        contactNote: orderNoteInput.value.trim(),
      }),
    });

    orderForm.hidden = true;
    orderDone.hidden = false;
  } catch (err) {
    alert(`Захиалга илгээхэд алдаа гарлаа: ${err.message}`);
  } finally {
    orderSubmitBtn.disabled = false;
    orderSubmitBtn.textContent = "Захиалга баталгаажуулах";
  }
});

// ---------- 1) түүхийн тойм зохиох ----------

async function composeStory(childName, age, gender, interests) {
  lastAttempt = { type: "story", childName, age, gender, interests };

  setState("loading");
  generateBtn.disabled = true;
  loadingText.textContent = "Үлгэрээ зохиож байна…";

  try {
    const data = await fetchJsonWithRetry(
      "/.netlify/functions/generate-story",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": authToken },
        body: JSON.stringify({ childName, age, gender, interests }),
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
  pages.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.caption;
    storyOutlineEl.appendChild(li);
  });
}

// ---------- 2) зөвхөн эхний хуудсыг зурах ----------

async function generateFirstPage() {
  lastAttempt = { type: "page0" };

  setState("loading");
  approveBtn.disabled = true;
  loadingText.textContent = "1-р хуудсыг зурж байна…";

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
        }),
      },
      {
        onRetry: (attempt, max) => {
          loadingText.textContent = `Дахин оролдож байна… (${attempt}/${max})`;
        },
      }
    );

    firstPageImageBase64 = data.imageBase64;

    originalImg.src = photoDataUrl;
    generatedImg.src = data.imageBase64;
    generatedCaption.textContent = storyPages[0].caption || "1-р хуудас";

    setState("result");
    orderCtaArea.hidden = false;
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    approveBtn.disabled = false;
  }
}

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

async function checkExistingSession() {
  // Имэйл дэх баталгаажуулах холбоос дээр дарж ирсэн эсэхийг эхлээд шалгана
  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = urlParams.get("verify");

  if (verifyToken) {
    authTabs.hidden = true;
    loginForm.hidden = true;
    signupForm.hidden = true;
    signupPending.hidden = true;
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
    const res = await fetch("/.netlify/functions/me", {
      headers: { "x-auth-token": authToken },
    });
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
  loginForm.hidden = false;
  signupForm.hidden = true;
  signupPending.hidden = true;
});

tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.hidden = false;
  loginForm.hidden = true;
  signupPending.hidden = true;
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

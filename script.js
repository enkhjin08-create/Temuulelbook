const uploadBox = document.getElementById("uploadBox");
const photoInput = document.getElementById("photoInput");
const uploadEmpty = document.getElementById("uploadEmpty");
const uploadPreview = document.getElementById("uploadPreview");
const uploadConfirm = document.getElementById("uploadConfirm");

const genForm = document.getElementById("genForm");
const generateBtn = document.getElementById("generateBtn");
const childNameInput = document.getElementById("childName");
const childAgeInput = document.getElementById("childAge");
const childInterestsInput = document.getElementById("childInterests");

const storyCard = document.getElementById("storyCard");
const storyTitleEl = document.getElementById("storyTitle");
const storySubtitleEl = document.getElementById("storySubtitle");
const storyOutlineEl = document.getElementById("storyOutline");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultLoading = document.getElementById("resultLoading");
const resultError = document.getElementById("resultError");
const resultPair = document.getElementById("resultPair");
const errorDetail = document.getElementById("errorDetail");
const retryBtn = document.getElementById("retryBtn");

const originalImg = document.getElementById("originalImg");
const generatedImg = document.getElementById("generatedImg");
const generatedCaption = document.getElementById("generatedCaption");

const loadingText = document.getElementById("loadingText");

const pagesGallery = document.getElementById("pagesGallery");
const nextPageArea = document.getElementById("nextPageArea");
const nextPageBtn = document.getElementById("nextPageBtn");
const nextPageHint = document.getElementById("nextPageHint");
const storyDone = document.getElementById("storyDone");
const pageCountEl = document.getElementById("pageCount");

let photoDataUrl = null;

// Түүхийн явцын төлөв
let currentChildName = null;
let storyPages = []; // [{ caption, sceneDescription }, ...]
let currentPageIndex = 0;
let lastGeneratedImageBase64 = null;
let lastAttempt = null; // { type: "story" } | { type: "page", childName, referenceImageBase64, pageIndex }

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

// ---------- form submit ----------

genForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const childName = childNameInput.value.trim();
  const age = childAgeInput.value.trim();
  const interests = childInterestsInput.value.trim();

  if (!childName) { childNameInput.focus(); return; }
  if (!age) { childAgeInput.focus(); return; }
  if (!interests) { childInterestsInput.focus(); return; }
  if (!photoDataUrl) {
    alert("Эхлээд хүүхдийн зургаа оруулна уу.");
    return;
  }

  // Шинэ захиалга эхэлж байгаа тул өмнөх явцыг цэвэрлэнэ
  pagesGallery.innerHTML = "";
  storyOutlineEl.innerHTML = "";
  storyOutlineEl.hidden = true;
  nextPageArea.hidden = true;
  storyDone.hidden = true;
  currentChildName = childName;
  storyPages = [];
  currentPageIndex = 0;

  await composeStory(childName, age, interests);
});

retryBtn.addEventListener("click", () => {
  if (!lastAttempt) return;
  if (lastAttempt.type === "story") {
    composeStory(lastAttempt.childName, lastAttempt.age, lastAttempt.interests);
  } else if (lastAttempt.type === "page") {
    generatePage(lastAttempt.childName, lastAttempt.referenceImageBase64, lastAttempt.pageIndex);
  }
});

nextPageBtn.addEventListener("click", () => {
  if (!lastGeneratedImageBase64 || !currentChildName) return;
  generatePage(currentChildName, lastGeneratedImageBase64, currentPageIndex + 1);
});

// ---------- 1) түүхийн тойм зохиох ----------

async function composeStory(childName, age, interests) {
  lastAttempt = { type: "story", childName, age, interests };

  setState("loading");
  generateBtn.disabled = true;
  loadingText.textContent = "Үлгэрээ зохиож байна…";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 29000);

  try {
    let res;
    try {
      res = await fetch("/.netlify/functions/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName, age, interests }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") {
        throw new Error("Хугацаа хэтэрлээ. Дахин оролдоно уу.");
      }
      throw new Error(`Сүлжээний алдаа: ${fetchErr.message}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Серверийн хариу уншигдсангүй (${res.status}).`);
    }

    if (!res.ok) {
      const detail = data.detail ? ` — ${data.detail}` : "";
      throw new Error((data.error || "Тодорхойгүй алдаа гарлаа.") + detail);
    }

    storyPages = data.pages;
    renderStoryCard(data.title, storyPages.length);
    renderOutline(storyPages, 0);

    // Түүхийн тойм бэлэн болмогц эхний хуудсыг шууд зурж эхэлнэ
    await generatePage(childName, photoDataUrl, 0);
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
    generateBtn.disabled = false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function renderStoryCard(title, pageCount) {
  storyTitleEl.textContent = title;
  storySubtitleEl.textContent = `${pageCount} хуудас түүх бэлэн боллоо`;
}

function renderOutline(pages, activeIndex) {
  storyOutlineEl.hidden = false;
  storyOutlineEl.innerHTML = "";
  pages.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = p.caption;
    if (i === activeIndex) li.classList.add("active");
    if (i < activeIndex) li.classList.add("done");
    storyOutlineEl.appendChild(li);
  });
}

// ---------- 2) хуудас бүрийг зурах ----------

async function generatePage(childName, referenceImageBase64, pageIndex) {
  const page = storyPages[pageIndex];
  if (!page) return;

  lastAttempt = { type: "page", childName, referenceImageBase64, pageIndex };

  setState("loading");
  generateBtn.disabled = true;
  nextPageBtn.disabled = true;
  loadingText.textContent = pageIndex === 0
    ? "1-р хуудсыг зурж байна…"
    : `${pageIndex + 1}-р хуудсыг зурж байна…`;
  renderOutline(storyPages, pageIndex);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 29000);

  try {
    let res;
    try {
      res = await fetch("/.netlify/functions/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName,
          photoBase64: referenceImageBase64,
          pageIndex,
          totalPages: storyPages.length,
          sceneDescription: page.sceneDescription,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") {
        throw new Error("Хугацаа хэтэрлээ (30 секунд). Gemini удаан хариулж байна, дахин оролдоно уу.");
      }
      throw new Error(`Сүлжээний алдаа: ${fetchErr.message}`);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Серверийн хариу уншигдсангүй (${res.status}).`);
    }

    if (!res.ok) {
      const detail = data.detail ? ` — ${data.detail}` : "";
      throw new Error((data.error || "Тодорхойгүй алдаа гарлаа.") + detail);
    }

    currentChildName = childName;
    currentPageIndex = data.pageIndex;
    lastGeneratedImageBase64 = data.imageBase64;

    if (pageIndex === 0) {
      originalImg.src = referenceImageBase64;
      generatedImg.src = data.imageBase64;
      generatedCaption.textContent = page.caption || "1-р хуудас";
      setState("result");
    } else {
      addPageToGallery(data.imageBase64, pageIndex + 1, page.caption);
      setState("result");
    }

    renderOutline(storyPages, pageIndex + 1);

    if (data.isLastPage) {
      nextPageArea.hidden = true;
      storyDone.hidden = false;
      pageCountEl.textContent = String(pageIndex + 1);
    } else {
      nextPageArea.hidden = false;
      storyDone.hidden = true;
      const nextCaption = storyPages[pageIndex + 1] ? storyPages[pageIndex + 1].caption : "";
      nextPageHint.textContent = nextCaption ? `Дараагийн хуудас: ${nextCaption}` : "Дараагийн мөчийг зурна";
    }
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    clearTimeout(timeoutId);
    generateBtn.disabled = false;
    nextPageBtn.disabled = false;
  }
}

function addPageToGallery(imageBase64, pageNumber, caption) {
  const figure = document.createElement("figure");
  figure.className = "polaroid generated";
  const img = document.createElement("img");
  img.src = imageBase64;
  img.alt = caption || `Хуудас ${pageNumber}`;
  const captionEl = document.createElement("figcaption");
  captionEl.textContent = caption || `${pageNumber}-р хуудас`;
  figure.appendChild(img);
  figure.appendChild(captionEl);
  pagesGallery.appendChild(figure);
}

function setState(state) {
  resultPlaceholder.hidden = state !== "placeholder";
  resultLoading.hidden = state !== "loading";
  resultError.hidden = state !== "error";
  resultPair.hidden = state !== "result";
}

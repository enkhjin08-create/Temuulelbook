const uploadBox = document.getElementById("uploadBox");
const photoInput = document.getElementById("photoInput");
const uploadEmpty = document.getElementById("uploadEmpty");
const uploadPreview = document.getElementById("uploadPreview");
const uploadConfirm = document.getElementById("uploadConfirm");

const genForm = document.getElementById("genForm");
const generateBtn = document.getElementById("generateBtn");
const childNameInput = document.getElementById("childName");

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

const STORY_ID = "trex-anhnii-uchral"; // энэ туршилтад ганц түүх ашиглаж байна

let photoDataUrl = null;

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
    // Хэрэв ямар нэг шалтгаанаар багасгаж чадахгүй бол эх зургийг ашиглана
    callback(dataUrl);
  };
  img.src = dataUrl;
}

// ---------- form submit ----------

genForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const childName = childNameInput.value.trim();
  if (!childName) {
    childNameInput.focus();
    return;
  }
  if (!photoDataUrl) {
    alert("Эхлээд хүүхдийн зургаа оруулна уу.");
    return;
  }

  await generate(childName, photoDataUrl);
});

retryBtn.addEventListener("click", () => {
  const childName = childNameInput.value.trim();
  if (childName && photoDataUrl) generate(childName, photoDataUrl);
});

async function generate(childName, photoBase64) {
  setState("loading");
  generateBtn.disabled = true;
  loadingText.textContent = "Захиалгыг эхлүүлж байна…";

  const jobId = (crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  try {
    // 1) Background function-ыг эхлүүлнэ (10 сек хугацааны хязгаараас чөлөөтэй)
    const startController = new AbortController();
    const startTimeout = setTimeout(() => startController.abort(), 20000);

    let startRes;
    try {
      startRes = await fetch("/.netlify/functions/start-generation-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, childName, photoBase64, storyId: STORY_ID }),
        signal: startController.signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") {
        throw new Error("Эхлүүлэх дуудлага хэт удаж байна (сүлжээ удаан байж магадгүй). Дахин оролдоно уу.");
      }
      throw new Error(`Сүлжээний алдаа: ${fetchErr.message}`);
    } finally {
      clearTimeout(startTimeout);
    }

    if (!startRes.ok) {
      let bodyText = "";
      try {
        bodyText = await startRes.text();
      } catch (e) {
        // ignore
      }
      throw new Error(`Эхлүүлэх дуудлага амжилтгүй боллоо (${startRes.status}): ${bodyText || "дэлгэрэнгүй мэдээлэл алга"}`);
    }

    // 2) 2 секунд тутам үр дүнг шалгана, дээд тал нь ~90 секунд хүлээнэ
    const maxAttempts = 45;
    let result = null;

    const statusLabels = {
      started: "Захиалгыг хүлээж авлаа…",
      "calling-gemini": "Түүхийг зурж байна…",
      "gemini-responded": "Дүрийг цэгцэлж байна…",
      pending: "Түүхийг зурж байна…",
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(2000);

      const res = await fetch(`/.netlify/functions/check-generation?jobId=${encodeURIComponent(jobId)}`);
      const data = await res.json();

      if (statusLabels[data.status]) {
        loadingText.textContent = statusLabels[data.status];
      }

      if (data.status === "done") {
        result = data;
        break;
      }
      if (data.status === "error") {
        throw new Error(data.error || "Тодорхойгүй алдаа гарлаа.");
      }
      // pending/started/calling-gemini/gemini-responded бол үргэлжлүүлж хүлээнэ
    }

    if (!result) {
      throw new Error("Хугацаа хэтэрлээ. Дахин оролдоно уу.");
    }

    originalImg.src = photoBase64;
    generatedImg.src = result.imageBase64;
    generatedCaption.textContent = `${childName} — үлгэрийн дүр`;
    setState("result");
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    generateBtn.disabled = false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setState(state) {
  resultPlaceholder.hidden = state !== "placeholder";
  resultLoading.hidden = state !== "loading";
  resultError.hidden = state !== "error";
  resultPair.hidden = state !== "result";
}

const uploadBox = document.getElementById("uploadBox");
const photoInput = document.getElementById("photoInput");
const uploadEmpty = document.getElementById("uploadEmpty");
const uploadPreview = document.getElementById("uploadPreview");

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
    photoDataUrl = reader.result;
    uploadPreview.src = photoDataUrl;
    uploadPreview.hidden = false;
    uploadEmpty.hidden = true;
  };
  reader.readAsDataURL(file);
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

  const loadingMessages = [
    "Түүхийг зурж байна…",
    "Өнгийг сонгож байна…",
    "Дүрийг амилуулж байна…",
  ];
  let mi = 0;
  const loadingTimer = setInterval(() => {
    mi = (mi + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[mi];
  }, 3500);

  try {
    const res = await fetch("/.netlify/functions/generate-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childName, photoBase64, storyId: STORY_ID }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Тодорхойгүй алдаа гарлаа.");
    }

    originalImg.src = photoBase64;
    generatedImg.src = data.imageBase64;
    generatedCaption.textContent = `${childName} — үлгэрийн дүр`;
    setState("result");
  } catch (err) {
    errorDetail.textContent = err.message || "Дахин оролдоно уу.";
    setState("error");
  } finally {
    clearInterval(loadingTimer);
    generateBtn.disabled = false;
  }
}

function setState(state) {
  resultPlaceholder.hidden = state !== "placeholder";
  resultLoading.hidden = state !== "loading";
  resultError.hidden = state !== "error";
  resultPair.hidden = state !== "result";
}

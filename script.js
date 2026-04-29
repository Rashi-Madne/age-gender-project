const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let isRunning = true;
let isStarted = false;
let modelsLoaded = false;
let videoLoaded = false;

// ================= STABILITY BUFFERS =================
let ageBuffer = [];
let genderBuffer = [];
let lastStableAge = null;
let noFaceCounter = 0;

// ================= DEBUG =================
console.log("JS Loaded ✅");

// ================= CAMERA =================
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      videoLoaded = true;
      console.log("Video Ready ✅");
      statusBox.innerText = "Camera Ready 📷";
      tryStart();
    };

  } catch (err) {
    console.error("Camera Error ❌", err);
    statusBox.innerText = "Camera Error ❌";
  }
}

// ================= MODELS =================
async function loadModels() {
  try {
    console.log("Loading Models...");

    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.ageGenderNet.loadFromUri('./models');

    modelsLoaded = true;

    console.log("Models Loaded ✅");
    statusBox.innerText = "AI Loaded ⚡";

    tryStart();

  } catch (err) {
    console.error("Model Load Failed ❌", err);
    statusBox.innerText = "Model Error ❌";
  }
}

// ================= START ONLY WHEN READY =================
function tryStart() {
  if (modelsLoaded && videoLoaded && !isStarted) {
    startDetection();
  }
}

// ================= DETECTION INIT =================
function startDetection() {

  isStarted = true;

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera-box").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  console.log("Detection Started 🚀");
  statusBox.innerText = "LIVE 🟢 Starting...";

  detectLoop();
}

// ================= MAIN LOOP =================
async function detectLoop() {

  if (!isRunning) {
    requestAnimationFrame(detectLoop);
    return;
  }

  try {

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, {
      width: video.videoWidth,
      height: video.videoHeight
    });

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ================= NO FACE =================
    if (!resized.length) {
      noFaceCounter++;

      if (noFaceCounter > 5) {
        statusBox.innerText = "Searching face... 🔍";
      }

      requestAnimationFrame(detectLoop);
      return;
    }

    noFaceCounter = 0;

    const result = resized[0];

    // ================= AGE SMOOTHING =================
    ageBuffer.push(result.age);
    if (ageBuffer.length > 20) ageBuffer.shift();

    const avgAge = ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    if (!lastStableAge) lastStableAge = avgAge;

    if (Math.abs(avgAge - lastStableAge) > 1.5) {
      lastStableAge = avgAge;
    }

    const minAge = Math.round(lastStableAge - 2);
    const maxAge = Math.round(lastStableAge + 2);

    // ================= GENDER STABILITY =================
    genderBuffer.push(result.gender);
    if (genderBuffer.length > 10) genderBuffer.shift();

    const gender = getMode(genderBuffer);

    // ================= UI UPDATE =================
    genderBox.innerText = gender;
    ageBox.innerText = `${minAge} - ${maxAge}`;
    statusBox.innerText = "LIVE 🟢 Detecting";

    // DRAW BOX
    faceapi.draw.drawDetections(canvas, resized);

  } catch (err) {
    console.error("Detection Error ❌", err);
    statusBox.innerText = "Error ❌";
  }

  requestAnimationFrame(detectLoop);
}

// ================= MODE FUNCTION =================
function getMode(arr) {
  return arr
    .sort((a, b) =>
      arr.filter(v => v === a).length -
      arr.filter(v => v === b).length
    )
    .pop();
}

// ================= SIDEBAR CONTROL =================
window.showView = function(view) {

  document.getElementById("liveView").classList.remove("active");
  document.getElementById("analyticsView").classList.remove("active");
  document.getElementById("settingsView").classList.remove("active");

  document.getElementById(view + "View").classList.add("active");

  if (view === "live") {
    statusBox.innerText = "LIVE 🟢";
  }
};

// ================= TOGGLE =================
window.toggleDetection = function() {
  isRunning = !isRunning;

  document.getElementById("btn").innerText =
    isRunning ? "⏸ Pause" : "▶ Start";

  statusBox.innerText = isRunning ? "Running 🚀" : "Paused ⏸";
};

// ================= START EVERYTHING =================
initCamera();
loadModels();

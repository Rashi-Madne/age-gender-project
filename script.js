const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let modelsReady = false;
let videoReady = false;
let running = true;

// ================= STABILITY =================
let ageBuffer = [];
let genderBuffer = [];
let noFaceCount = 0;
let lastStableAge = null;

// ================= INIT CAMERA =================
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      videoReady = true;
      statusBox.innerText = "Camera Ready 📷";

      checkStart();
    };

  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ================= LOAD MODELS =================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');

  modelsReady = true;
  statusBox.innerText = "AI Loaded ⚡";

  checkStart();
}

// ================= START ONLY WHEN BOTH READY =================
function checkStart() {
  if (modelsReady && videoReady) {
    startDetection();
  }
}

// ================= MAIN DETECTION LOOP =================
async function startDetection() {

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera-box").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  statusBox.innerText = "Initializing AI 🎯";

  detectLoop();
}

// ================= CONTROLLED LOOP =================
async function detectLoop() {

  if (!running) {
    requestAnimationFrame(detectLoop);
    return;
  }

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
    noFaceCount++;

    if (noFaceCount > 5) {
      statusBox.innerText = "Searching face... 🔍";
    }

    requestAnimationFrame(detectLoop);
    return;
  }

  noFaceCount = 0;

  const d = resized[0];

  // ================= AGE SMOOTH =================
  ageBuffer.push(d.age);
  if (ageBuffer.length > 20) ageBuffer.shift();

  const avgAge =
    ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

  if (!lastStableAge) lastStableAge = avgAge;

  if (Math.abs(avgAge - lastStableAge) > 1.2) {
    lastStableAge = avgAge;
  }

  const minAge = Math.round(lastStableAge - 2);
  const maxAge = Math.round(lastStableAge + 2);

  // ================= GENDER SMOOTH =================
  genderBuffer.push(d.gender);
  if (genderBuffer.length > 8) genderBuffer.shift();

  const stableGender = mode(genderBuffer);

  // ================= UI UPDATE =================
  genderBox.innerText = stableGender;
  ageBox.innerText = `${minAge} - ${maxAge}`;

  statusBox.innerText = "LIVE 🟢 Tracking Face";

  faceapi.draw.drawDetections(canvas, resized);

  requestAnimationFrame(detectLoop);
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

// ================= START EVERYTHING =================
startCamera();
loadModels();

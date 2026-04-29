const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let running = true;
let started = false;

// ================= STABILITY =================
let ageBuffer = [];
let genderBuffer = [];
let noFaceCount = 0;
let lastStableAge = null;

// ================= 1. START CAMERA IMMEDIATELY =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    statusBox.innerText = "Camera Ready 📷";
  });

// ================= 2. LOAD MODELS IN BACKGROUND =================
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.ageGenderNet.loadFromUri('./models')
]).then(() => {
  statusBox.innerText = "AI Loaded ⚡ Starting...";

  // start detection immediately after models load
  startDetection();
});

// ================= DETECTION =================
function startDetection() {

  if (started) return;
  started = true;

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera-box").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  // 🔥 NO DELAY START (runs immediately)
  requestAnimationFrame(detectLoop);

  async function detectLoop() {

    if (!running) {
      requestAnimationFrame(detectLoop);
      return;
    }

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ================= NO FACE =================
    if (!resized.length) {
      noFaceCount++;

      if (noFaceCount > 3) {
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

    // ================= GENDER =================
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 8) genderBuffer.shift();

    const stableGender = mode(genderBuffer);

    // ================= UI =================
    genderBox.innerText = stableGender;
    ageBox.innerText = `${minAge} - ${maxAge}`;

    statusBox.innerText = "LIVE 🟢 Detecting";

    faceapi.draw.drawDetections(canvas, resized);

    requestAnimationFrame(detectLoop);
  }
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

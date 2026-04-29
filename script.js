const video = document.getElementById("video");

const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let started = false;

// smoothing buffers
let ageBuffer = [];
let genderHistory = [];

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  });

// ================= LOAD MODELS =================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');

  statusBox.innerText = "Models Loaded ✅";

  video.onloadedmetadata = () => {
    startDetection();
  };
}

loadModels();

// ================= DETECTION =================
function startDetection() {

  if (started) return;
  started = true;

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera-card").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  statusBox.innerText = "Running 🚀";

  setInterval(async () => {

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!resized.length) {
      statusBox.innerText = "No face detected";
      return;
    }

    const d = resized[0];

    // ---------------- SMOOTH AGE ----------------
    ageBuffer.push(d.age);
    if (ageBuffer.length > 10) ageBuffer.shift();

    const avgAge =
      ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    // ---------------- SMOOTH GENDER ----------------
    genderHistory.push(d.gender);
    if (genderHistory.length > 5) genderHistory.shift();

    const gender = mode(genderHistory);

    // ---------------- UI UPDATE ----------------
    ageBox.innerText = Math.round(avgAge);
    genderBox.innerText = gender;

    statusBox.innerText = "Tracking 🎯";

    faceapi.draw.drawDetections(canvas, resized);

  }, 200);
}

// ================= HELPER =================
function mode(arr) {
  return arr.sort((a,b) =>
    arr.filter(v => v===a).length - arr.filter(v => v===b).length
  ).pop();
}

// ================= SNAPSHOT =================
function takeSnapshot() {
  const snap = document.createElement("canvas");
  snap.width = video.videoWidth;
  snap.height = video.videoHeight;

  const ctx = snap.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const link = document.createElement("a");
  link.download = "ai-dashboard.png";
  link.href = snap.toDataURL("image/png");
  link.click();
}

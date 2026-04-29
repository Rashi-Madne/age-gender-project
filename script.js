const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let started = false;
let running = true;

// ================= STABILITY =================
let ageBuffer = [];
let genderBuffer = [];
let noFaceCount = 0;
let lastStableAge = null;

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  });

// ================= LOAD MODELS =================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');

  statusBox.innerText = "AI Ready ✅";

  video.onloadedmetadata = () => {
    startDetection();
  };
}

loadModels();

// ================= TOGGLE =================
function toggleDetection() {
  running = !running;

  document.getElementById("btn").innerText =
    running ? "⏸ Pause Detection" : "▶ Start Detection";

  statusBox.innerText =
    running ? "Running 🚀" : "Paused ⏸";
}

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

  setInterval(async () => {

    if (!running) return;

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ================= NO FACE =================
    if (!resized.length) {
      noFaceCount++;

      if (noFaceCount > 5) {
        statusBox.innerText = "Searching face... 🔍";
      }

      return;
    }

    noFaceCount = 0;

    const d = resized[0];

    // ================= AGE SMOOTH =================
    ageBuffer.push(d.age);
    if (ageBuffer.length > 25) ageBuffer.shift();

    const avgAge =
      ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    if (!lastStableAge) lastStableAge = avgAge;

    if (Math.abs(avgAge - lastStableAge) > 1.5) {
      lastStableAge = avgAge;
    }

    const minAge = Math.round(lastStableAge - 2);
    const maxAge = Math.round(lastStableAge + 2);

    // ================= GENDER =================
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 10) genderBuffer.shift();

    const stableGender = mode(genderBuffer);

    // ================= UI =================
    genderBox.innerText = stableGender;
    ageBox.innerText = `${minAge} - ${maxAge}`;

    statusBox.innerText = "LIVE 🟢 Face Detected";

    faceapi.draw.drawDetections(canvas, resized);

  }, 200);
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let running = true;
let started = false;

// STABILITY
let ageBuffer = [];
let genderBuffer = [];
let noFaceCount = 0;
let lastStableAge = null;

// ================= SIDEBAR FIX =================
window.showView = function(view) {

  document.getElementById("liveView").classList.remove("active");
  document.getElementById("analyticsView").classList.remove("active");
  document.getElementById("settingsView").classList.remove("active");

  document.getElementById(view + "View").classList.add("active");
};

// ================= TOGGLE =================
window.toggleDetection = function() {
  running = !running;
  document.getElementById("btn").innerText =
    running ? "⏸ Pause" : "▶ Start";

  statusBox.innerText = running ? "Running 🚀" : "Paused ⏸";
};

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  });

// ================= MODELS =================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');

  statusBox.innerText = "AI Ready ⚡";

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
  document.querySelector(".camera-box").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  loop();

  async function loop() {

    if (!running) {
      requestAnimationFrame(loop);
      return;
    }

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // NO FACE
    if (!resized.length) {
      noFaceCount++;
      if (noFaceCount > 5) statusBox.innerText = "Searching 🔍";
      requestAnimationFrame(loop);
      return;
    }

    noFaceCount = 0;

    const d = resized[0];

    // AGE STABILITY
    ageBuffer.push(d.age);
    if (ageBuffer.length > 20) ageBuffer.shift();

    const avg = ageBuffer.reduce((a,b)=>a+b,0)/ageBuffer.length;

    if (!lastStableAge) lastStableAge = avg;

    if (Math.abs(avg - lastStableAge) > 1.5) {
      lastStableAge = avg;
    }

    const min = Math.round(lastStableAge - 2);
    const max = Math.round(lastStableAge + 2);

    // GENDER STABILITY
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 8) genderBuffer.shift();

    const gender = mode(genderBuffer);

    // UI
    genderBox.innerText = gender;
    ageBox.innerText = `${min} - ${max}`;
    statusBox.innerText = "LIVE 🟢";

    faceapi.draw.drawDetections(canvas, resized);

    requestAnimationFrame(loop);
  }
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

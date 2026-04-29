const video = document.getElementById("video");

const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let started = false;

// stability buffers
let ageBuffer = [];
let genderBuffer = [];

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
  document.querySelector(".camera-box").appendChild(canvas);

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

    // ================= AGE SMOOTHING =================
    ageBuffer.push(d.age);
    if (ageBuffer.length > 12) ageBuffer.shift();

    const avgAge =
      ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    // 👉 AGE RANGE LOGIC (IMPORTANT PART)
    const minAge = Math.max(0, Math.round(avgAge - 2));
    const maxAge = Math.round(avgAge + 2);

    // ================= GENDER STABILITY =================
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 6) genderBuffer.shift();

    const stableGender = mode(genderBuffer);

    // ================= UI =================
    genderBox.innerText = stableGender;
    ageBox.innerText = `${minAge} - ${maxAge}`;

    statusBox.innerText = "Tracking 🎯";

    faceapi.draw.drawDetections(canvas, resized);

  }, 400);
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

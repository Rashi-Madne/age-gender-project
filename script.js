const video = document.getElementById("video");
const genderBox = document.getElementById("gender");
const ageBox = document.getElementById("age");
const statusBox = document.getElementById("status");

let canvas;
let started = false;

// ================= STABILITY STORAGE =================
let ageBuffer = [];
let genderBuffer = [];
let noFaceCount = 0;
let lastStableAge = null;

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    console.log("Camera started ✅");
  })
  .catch(err => console.error("Camera error:", err));

// ================= LOAD MODELS =================
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.ageGenderNet.loadFromUri('./models');

    console.log("Models loaded ✅");
    statusBox.innerText = "Models Loaded ✅";

    video.onloadedmetadata = () => {
      startDetection();
    };

  } catch (err) {
    console.error("Model loading error ❌", err);
  }
}

loadModels();

// ================= START =================
function startDetection() {

  if (started) return;
  started = true;

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  console.log("Detection started 🚀");

  setInterval(async () => {

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ================= FACE DETECTED =================
    if (resized.length > 0) {

      noFaceCount = 0;

      const d = resized[0];

      // -------- AGE SMOOTHING --------
      ageBuffer.push(d.age);
      if (ageBuffer.length > 30) ageBuffer.shift();

      const avgAge =
        ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

      if (lastStableAge === null) {
        lastStableAge = avgAge;
      }

      const diff = Math.abs(avgAge - lastStableAge);

      if (diff > 1.5) {
        lastStableAge = avgAge;
      }

      const minAge = Math.max(0, Math.round(lastStableAge - 2));
      const maxAge = Math.round(lastStableAge + 2);

      // -------- GENDER STABILITY --------
      genderBuffer.push(d.gender);
      if (genderBuffer.length > 12) genderBuffer.shift();

      const stableGender = mode(genderBuffer);

      // -------- UI UPDATE --------
      genderBox.innerText = stableGender;
      ageBox.innerText = `${minAge} - ${maxAge}`;

      statusBox.innerText = "Tracking 🎯";

      faceapi.draw.drawDetections(canvas, resized);

    }

    // ================= NO FACE =================
    else {

      noFaceCount++;

      if (noFaceCount > 5) {
        statusBox.innerText = "No face detected ❌";
      }
    }

  }, 200);
}

// ================= MODE FUNCTION =================
function mode(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length -
    arr.filter(v => v === b).length
  ).pop();
}

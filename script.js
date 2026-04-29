const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;
let started = false;

// ====== STABILITY BUFFERS ======
let ageBuffer = [];
let genderBuffer = [];

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

    startDetection();

  } catch (err) {
    console.error("Model loading error ❌", err);
  }
}

loadModels();

// ================= START DETECTION =================
function startDetection() {

  const wait = setInterval(() => {
    if (video.readyState >= 2) {
      clearInterval(wait);
      runDetection();
    }
  }, 200);
}

// ================= RUN DETECTION =================
function runDetection() {

  if (started) return;
  started = true;

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".wrapper").appendChild(canvas);

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

    if (!resized.length) {
      result.innerText = "No face detected ❌";
      return;
    }

    const d = resized[0];

    // ================= AGE SMOOTHING =================
    let rawAge = d.age;

    if (ageBuffer.length > 0) {
      const last = ageBuffer[ageBuffer.length - 1];

      // ignore sudden jumps (noise filter)
      if (Math.abs(rawAge - last) > 5) {
        rawAge = last;
      }
    }

    ageBuffer.push(rawAge);
    if (ageBuffer.length > 15) ageBuffer.shift();

    const smoothAge =
      ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    // ================= GENDER STABILITY =================
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 7) genderBuffer.shift();

    const stableGender = mode(genderBuffer);

    // ================= UI OUTPUT =================
    result.innerText =
      `Gender: ${stableGender} | Age: ${Math.round(smoothAge)}`;

    faceapi.draw.drawDetections(canvas, resized);

  }, 500); // slower loop = more stable
}

// ================= MODE FUNCTION =================
function mode(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length -
    arr.filter(v => v === b).length
  ).pop();
}

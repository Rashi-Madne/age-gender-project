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
  .catch(err => console.error(err));

// ================= LOAD MODELS =================
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');

  console.log("Models loaded ✅");

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
    ageBuffer.push(d.age);
    if (ageBuffer.length > 8) ageBuffer.shift();

    const smoothAge =
      ageBuffer.reduce((a, b) => a + b, 0) / ageBuffer.length;

    // ================= GENDER STABILITY =================
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 5) genderBuffer.shift();

    const stableGender = mode(genderBuffer);

    // ================= OUTPUT =================
    result.innerText =
      `Gender: ${stableGender} | Age: ${Math.round(smoothAge)}`;

    faceapi.draw.drawDetections(canvas, resized);

  }, 400); // slower = more stable
}

// ================= MODE FUNCTION =================
function mode(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length -
    arr.filter(v => v === b).length
  ).pop();
}

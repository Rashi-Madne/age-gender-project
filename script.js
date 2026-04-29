const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;
let started = false;

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

    video.onloadedmetadata = () => {
      startDetection();
    };

  } catch (err) {
    console.error("Model loading error ❌", err);
  }
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

    faceapi.draw.drawDetections(canvas, resized);

    const d = resized[0];

    result.innerText =
      `Gender: ${d.gender} | Age: ${Math.round(d.age)}`;

  }, 200);
}

// ================= SNAPSHOT =================
function takeSnapshot() {
  const snap = document.createElement("canvas");
  snap.width = video.videoWidth;
  snap.height = video.videoHeight;

  const ctx = snap.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const link = document.createElement("a");
  link.download = "face.png";
  link.href = snap.toDataURL("image/png");
  link.click();
}

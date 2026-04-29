const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;
let started = false;

let ageBuffer = [];
let genderBuffer = [];

// ================= CAMERA =================
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => console.error(err));

// ================= LOAD MODELS =================
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    await faceapi.nets.ageGenderNet.loadFromUri('./models');

    console.log("Models loaded ✅");

    startDetection(); // IMPORTANT: start directly after models

  } catch (err) {
    console.error("Model error ❌", err);
  }
}

loadModels();

// ================= START =================
function startDetection() {

  const waitVideo = setInterval(() => {

    if (video.readyState >= 2) { // video is ready
      clearInterval(waitVideo);
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

    // smooth age
    ageBuffer.push(d.age);
    if (ageBuffer.length > 10) ageBuffer.shift();
    const avgAge = ageBuffer.reduce((a,b)=>a+b,0)/ageBuffer.length;

    // stable gender
    genderBuffer.push(d.gender);
    if (genderBuffer.length > 5) genderBuffer.shift();
    const stableGender = mode(genderBuffer);

    result.innerText =
      `Gender: ${stableGender} | Age: ${Math.round(avgAge)}`;

    faceapi.draw.drawDetections(canvas, resized);

  }, 300);
}

// ================= MODE =================
function mode(arr) {
  return arr.sort((a,b)=>
    arr.filter(v=>v===a).length -
    arr.filter(v=>v===b).length
  ).pop();
}

const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;

// CAMERA
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => console.error("Camera error:", err));

// LOAD MODELS
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');
  await faceapi.nets.faceExpressionNet.loadFromUri('./models');

  console.log("Models loaded ✅");

  video.addEventListener("loadeddata", startDetection);
}

loadModels();

// DETECTION
function startDetection() {

  if (canvas) canvas.remove();

  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".wrapper").appendChild(canvas);

  const displaySize = {
    width: video.videoWidth,
    height: video.videoHeight
  };

  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender()
      .withFaceExpressions();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!resized.length) {
      result.innerText = "No face detected ❌";
      return;
    }

    faceapi.draw.drawDetections(canvas, resized);

    const d = resized[0];

    const emotion = Object.keys(d.expressions).reduce((a, b) =>
      d.expressions[a] > d.expressions[b] ? a : b
    );

    result.innerText =
      `Gender: ${d.gender} | Age: ${Math.round(d.age)} | ${emotion}`;

  }, 200);
}

const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;

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
    await faceapi.nets.faceExpressionNet.loadFromUri('./models');

    console.log("Models loaded ✅");
    startDetection();

  } catch (err) {
    console.error("Model loading error ❌", err);
  }
}

loadModels();

// ================= DETECTION =================
function startDetection() {

  video.addEventListener("play", () => {

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

      resized.forEach(d => {

        const { age, gender, detection, expressions } = d;

        const emotion = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );

        const label =
          `${gender} | ${Math.round(age)} yrs | ${emotion}`;

        new faceapi.draw.DrawTextField(
          [label],
          detection.box.bottomLeft
        ).draw(canvas);
      });

      const d = resized[0];
      result.innerText =
        `Gender: ${d.gender} | Age: ${Math.round(d.age)}`;

    }, 120);
  });
}

// ================= SNAPSHOT =================
function takeSnapshot() {
  const snap = document.createElement("canvas");
  snap.width = video.videoWidth;
  snap.height = video.videoHeight;

  const ctx = snap.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const link = document.createElement("a");
  link.download = "ai-face.png";
  link.href = snap.toDataURL("image/png");
  link.click();
}

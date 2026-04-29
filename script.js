const video = document.getElementById("video");
const result = document.getElementById("result");

let canvas;

// CAMERA
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error(err));

// LOAD MODELS
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.ageGenderNet.loadFromUri('./models');
  await faceapi.nets.faceExpressionNet.loadFromUri('./models');

  console.log("All models loaded ✅");

  start();
}

loadModels();

// START DETECTION
function start() {

  video.addEventListener("play", () => {

    canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector(".wrapper").appendChild(canvas);

    const displaySize = {
      width: video.width,
      height: video.height
    };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender()
        .withFaceExpressions();

      const resized = faceapi.resizeResults(detections, displaySize);

      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      if (!resized.length) {
        result.innerText = "No face detected ❌";
        return;
      }

      faceapi.draw.drawDetections(canvas, resized);

      resized.forEach(d => {

        const { age, gender, expressions, detection } = d;

        const emotion = Object.keys(expressions).reduce((a,b)=>
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



```js id="snap1"
function takeSnapshot() {
  const canvasSnap = document.createElement("canvas");
  canvasSnap.width = video.videoWidth;
  canvasSnap.height = video.videoHeight;

  const ctx = canvasSnap.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const link = document.createElement("a");
  link.download = "ai-face.png";
  link.href = canvasSnap.toDataURL();
  link.click();
}

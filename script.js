const video = document.getElementById("video");
const result = document.getElementById("result");

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    video.play();
    console.log("Camera started ✅");
  })
  .catch(err => {
    console.error("Camera error:", err);
  });

// Load models
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    console.log("Face model loaded ✅");

    await faceapi.nets.ageGenderNet.loadFromUri('./models');
    console.log("Age/Gender model loaded ✅");

    start(); // 👈 only start AFTER models loaded
  } catch (error) {
    console.error("Model loading error ❌", error);
  }
}

loadModels();

function start() {
  console.log("Detection started 🚀");

  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender();

      console.log("Detecting...");

      if (detections.length === 0) {
        result.innerText = "No face detected ❌";
        return;
      }

      const d = detections[0];

      result.innerText =
        "Gender: " + d.gender +
        " | Age: " + Math.round(d.age);

      console.log("Result:", d.gender, Math.round(d.age));

    } catch (err) {
      console.error("Detection error ❌", err);
    }
  }, 1000);
}
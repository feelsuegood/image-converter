// JavaScript for requesting a pre-signed URL and uploading an image
async function uploadImage() {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("image");
  const file = fileInput.files[0];
  const width = document.getElementById("width").value;
  const height = document.getElementById("height").value;
  const format = document.getElementById("format").value;

  if (!file) {
    alert("Please upload an image file.");
    return;
  }

  try {
    const response = await fetch("/presigned-url");
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const data = await response.json();
    data.width = width;
    data.height = height;
    data.format = format;

    console.log("🟢data:", data);
    const uploadResponse = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": `image/${format}` },
      body: file,
    });
    console.log("🟢uploadResponse:", uploadResponse);
    console.log("🟢uploadResponse.ok:", uploadResponse.ok);
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`);
    }

    // ! Here starts problems
    const result = await fetch("/result", {
      method: "POST",
      headers: { "Content-Type": `application/json` },
      body: JSON.stringify(data),
    });

    console.log("🟢result", result);
    console.log("🟢result.body", result.body);
    // ! 이제 여기서부터 이미지 처리 될동안 기다리는 기능을 넣어야함!
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  }
}

// * Handle button clicks
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("cancelButton")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("processingText").style.display = "none";
      window.location.href = "/";
    });

  function setImageProperties(width, height, format = "jpeg") {
    document.getElementById("width").value = width;
    document.getElementById("height").value = height;
    document.getElementById("format").value = format;
  }

  document
    .getElementById("instagramButton")
    .addEventListener("click", () => setImageProperties(1080, 1080));
  document
    .getElementById("youtubeThumbnailButton")
    .addEventListener("click", () => setImageProperties(1280, 720));
  document
    .getElementById("linkedinProfileButton")
    .addEventListener("click", () => setImageProperties(400, 400));
});

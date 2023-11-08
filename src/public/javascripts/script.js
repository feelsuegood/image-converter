// JavaScript for requesting a pre-signed URL and uploading an image
async function uploadImage() {
  // const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("image");
  const file = fileInput.files[0];
  const width = document.getElementById("width").value;
  const height = document.getElementById("height").value;
  const format = document.getElementById("format").value;

  if (!file || !width || !height) {
    alert("Please fill all items.");
    return;
  }
  document.body.classList.add("loading");
  document.getElementById("loadingIndicator").style.display = "block";

  try {
    // * Get the pre-signed URL
    const response = await fetch("/presigned-url?format=" + format);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    // * Get the data from user and upload image to S3
    const data = await response.json();
    data.width = width;
    data.height = height;
    data.format = format;
    console.log("🔹 data:", data);
    const uploadResponse = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": `image/${format}` },
      body: file,
    });
    console.log("🔹 uploadResponse:", uploadResponse);
    console.log("🔹 uploadResponse.ok:", uploadResponse.ok);
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`);
    }

    // * Send the request to process the image
    const resultResponse = await fetch("/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: data.key,
        url: data.url,
        width,
        height,
        format,
      }),
    });
    if (resultResponse.ok) {
      window.location.href = `/result?key=${encodeURIComponent(
        data.key
      )}&url=${encodeURIComponent(data.url)}&format=${encodeURIComponent(
        format
      )}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(
        height
      )}`;
    } else {
      throw new Error(`Error in image processing: ${resultResponse.status}`);
    }
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  } finally {
    // Hide loading message
    document.getElementById("loadingIndicator").style.display = "none";
    document.body.classList.remove("loading");
  }
}

// * Handle button clicks

document.addEventListener("DOMContentLoaded", function () {
  const cancelButton = document.getElementById("cancelButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "/";
    });
  }

  function setImageProperties(width, height, format = "jpeg") {
    document.getElementById("width").value = width;
    document.getElementById("height").value = height;
    document.getElementById("format").value = format;
  }
  const instagramButton = document.getElementById("instagramButton");
  const youtubeThumbnailButton = document.getElementById(
    "youtubeThumbnailButton"
  );
  const linkedinProfileButton = document.getElementById(
    "linkedinProfileButton"
  );

  if (instagramButton) {
    instagramButton.addEventListener("click", () =>
      setImageProperties(1080, 1080)
    );
  }
  if (youtubeThumbnailButton) {
    youtubeThumbnailButton.addEventListener("click", () =>
      setImageProperties(1280, 720)
    );
  }
  if (linkedinProfileButton) {
    linkedinProfileButton.addEventListener("click", () =>
      setImageProperties(400, 400)
    );
  }
});

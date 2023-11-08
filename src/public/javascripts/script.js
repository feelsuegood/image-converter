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
    // Request a pre-signed URL from the server
    const response = await fetch("/get-presigned-url");
    const data = await response.json();

    // Upload the file to S3 using the pre-signed URL
    await fetch(data.url, {
      method: "PUT",
      headers: {
        "Content-Type": `image/${format}`,
      },
      body: file,
    });

    // Set form data and send it to the server
    const formData = new FormData(form);
    formData.append("imageKey", data.key); // Add the key generated via pre-signed URL
    formData.append("width", width); // Add width
    formData.append("height", height); // Add height
    formData.append("format", format); // Add format

    // Send the conversion request
    const result = await fetch("/result", {
      method: "POST",
      body: formData,
    });

    // Process the result
    // ...
  } catch (error) {
    console.error("Error:", error);
  }
}

// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Set the image properties based on the button clicked
  function setImageProperties(width, height, format = "jpeg") {
    document.getElementById("width").value = width;
    document.getElementById("height").value = height;
    document.getElementById("format").value = format;
  }

  // Event listeners for button clicks
  document
    .getElementById("instagramButton")
    .addEventListener("click", function () {
      setImageProperties(1080, 1080); // Instagram size
    });

  document
    .getElementById("youtubeThumbnailButton")
    .addEventListener("click", function () {
      setImageProperties(1280, 720); // YouTube Thumbnail size
    });

  document
    .getElementById("linkedinProfileButton")
    .addEventListener("click", function () {
      setImageProperties(400, 400); // LinkedIn Profile size
    });
});

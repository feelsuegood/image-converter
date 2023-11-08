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
    const response = await fetch("/presigned-url");
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const data = await response.json();

    // Upload the file to S3 using the pre-signed URL
    const uploadResponse = await fetch(data.url, {
      method: "PUT",
      headers: {
        "Content-Type": `image/${format}`,
      },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`);
    }
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

    // show the the result
    const resultData = await result.json();
    if (resultData.convertedImageUrl) {
      // Display the image or provide a download link
      const imageContainer = document.getElementById("imageContainer"); // 이미지를 표시할 컨테이너
      imageContainer.innerHTML = `<img src="${resultData.convertedImageUrl}" alt="Converted Image"/>`;

      // Optionally, provide a download link
      imageContainer.innerHTML += `<a href="${resultData.convertedImageUrl}" download>Download Converted Image</a>`;
    } else {
      alert("Image conversion failed.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
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

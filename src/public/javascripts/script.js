// JavaScript for requesting a pre-signed URL for uploading original images and uploading an image
async function uploadImage() {
  const width = document.getElementById("width").value;
  const height = document.getElementById("height").value;
  const format = document.getElementById("format").value;
  const fileInput = document.getElementById("image");
  const file = fileInput.files[0];

  // check if all fields are filled
  if (!file) {
    alert("Please upload an image file.");
    return;
  } else if (!width) {
    alert("Please enter the width.");
    return;
  } else if (!height) {
    alert("Please enter the height.");
    return;
  }

  // Check if the user input is valid or not
  const maxSize = 10 * 1024 * 1024; // image file size limit: 10MB
  const maxWidth = 1920; // image width limit: 1920px
  const maxHeight = 1080; //  image height limit: 1080px

  const fileSize = file.size;
  if (fileSize > maxSize) {
    alert("The maximum image file size is 10MB.");
    fileInput.value = ""; // reset the input
    return;
  }
  if (width > maxWidth || width <= 0) {
    alert("The width should be between 1 and 1920px.");
    width = ""; // reset the input
  }
  if (height > maxHeight || height <= 0) {
    alert("The height should be between 1 and 1080px.");
    height = ""; // reset the input
  }

  // Display loading page
  document.body.classList.add("loading");
  document.getElementById("loadingIndicator").style.display = "block";

  try {
    // Send the request to get the pre-signed URL for uploading the original image
    const response = await fetch("/presigned-url?format=" + format);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    data.width = width;
    data.height = height;
    data.format = format;
    console.log("🔹 image conversion data:", data);

    // Upload image to S3 by using pre-signed URL
    const uploadResponse = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": `image/${format}` },
      body: file,
    });
    console.log("🔹 uploadResponse:", uploadResponse);
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`);
    }

    // Send the request to get the pre-signed URL for downloading the converted image
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

    const resultData = await resultResponse.json();
    console.log("🔹 resultData:", resultData);

    // Redirect to the result page and display result page with the converted image
    if (resultResponse.ok) {
      window.location.href = `/result?key=${encodeURIComponent(
        resultData.key
      )}&url=${encodeURIComponent(resultData.url)}&format=${encodeURIComponent(
        resultData.format
      )}&width=${encodeURIComponent(
        resultData.width
      )}&height=${encodeURIComponent(resultData.height)}`;
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

// Handle button clicks
document.addEventListener("DOMContentLoaded", function () {
  // Cancle button
  const cancelButton = document.getElementById("cancelButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "/";
    });
  }

  // auto-fill button
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

// Handle download button click on result page
const downloadButton = document.getElementById("downloadButton");
if (downloadButton) {
  document
    .getElementById("downloadButton")
    .addEventListener("click", function () {
      const url = document
        .getElementById("downloadButton")
        .getAttribute("data-url");
      const filename = document
        .getElementById("downloadButton")
        .getAttribute("data-filename");

      async function downloadFile(url) {
        try {
          // Fetch the image from S3
          const response = await fetch(url, { mode: "cors" });
          if (!response.ok) throw new Error(`Error: ${response.statusText}`);

          // Convert response data to a Blob
          const blob = await response.blob();

          // Create a URL from the Blob data
          const blobUrl = window.URL.createObjectURL(blob);

          // Create a virtual link
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename; // Specify the desired file name here

          // Click the link to download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Revoke the Blob URL
          window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error("Download failed:", error);
        }
      }

      // The pre-signed URL generated by the server
      const signedUrl = url;

      // Execute file download
      downloadFile(signedUrl);
    });
}

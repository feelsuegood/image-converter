// Wait until the DOM is fully loaded
// JavaScript code to handle Instagram button click
document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and the processing text
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");

  form.addEventListener("submit", function (e) {
    // Prevent the default form submission
    e.preventDefault();

    // Get reference to the file input element
    const fileInput = document.getElementById("image");

    // Check if any file is uploaded
    if (fileInput.files.length === 0) {
      console.log("No file uploaded"); // Log the error message
      alert("Please upload an image file.");
      return;
    }

    form.submit();
    processingText.style.display = "block";

    // Show alert message if processing an image is too long
    setTimeout(function () {
      alert("Please try again.");
      window.location.href = "/";
    }, 10000);
  });

  // Attach click event to 'cancelButton'
  document
    .getElementById("cancelButton")
    .addEventListener("click", function (e) {
      // Prevent form submission
      e.preventDefault();

      // Hide the 'processingText'
      processingText.style.display = "none";

      // Navigate to the root router
      window.location.href = "/";
    });

  // Instagram Post autofill
  document
    .getElementById("instagramButton")
    .addEventListener("click", function () {
      // Set the width and height to 1080px for Instagram
      document.getElementById("width").value = 1080;
      document.getElementById("height").value = 1080;

      // Set the image format to JPEG
      document.getElementById("format").value = "jpeg";
    });
  // YouTube Thumbnail autofill
  document
    .getElementById("youtubeThumbnailButton")
    .addEventListener("click", function () {
      // Set width and height for YouTube Thumbnail
      document.getElementById("width").value = 1280;
      document.getElementById("height").value = 720;

      // Set image format to JPEG
      document.getElementById("format").value = "jpeg";
    });

  // LinkedIn Profile autofill
  document
    .getElementById("linkedinProfileButton")
    .addEventListener("click", function () {
      // Set width and height for LinkedIn Profile
      document.getElementById("width").value = 400;
      document.getElementById("height").value = 400;

      // Set image format to JPEG
      document.getElementById("format").value = "jpeg";
    });
});

// Wait until the DOM is fully loaded
// JavaScript code to handle Instagram button click
document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and the processing text
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");
  let timeout; // Define a variable to hold the timeout ID
  let formSubmitted = false; // Define a flag to track if the form has been submitted successfully
  let counter = 0; // Count the number of retries
  let maxRetries = 3; // Maximum number of retries

  form.addEventListener("submit", function (e) {
    // Prevent the default form submission
    e.preventDefault();

    // Get reference to the file input element
    const fileInput = document.getElementById("image");
    const submitButton = form.querySelector("#submitButton"); // Get the submit button within the form

    // Check if any file is uploaded
    if (fileInput.files.length === 0) {
      console.log("No file uploaded"); // Log the error message
      alert("Please upload an image file.");
      return;
    }

    form.submit();
    submitButton.disabled = true;

    // Scroll through the screen to processingText.
    processingText.style.display = "block"; // Display the processingText
    setTimeout(function () {
      processingText.scrollIntoView({ behavior: "smooth" }); // Scroll to processingText
    }, 100);

    setTimeout(function () {
      alert("Please try again");
      submitButton.disabled = false;
      window.location.href = "/";
    }, 15000);
  });

  // * Attach click event to 'cancelButton'
  document
    .getElementById("cancelButton")
    .addEventListener("click", function (e) {
      // Prevent form submission
      e.preventDefault();

      // Hide the 'processingText'
      processingText.style.display = "none";

      // Navigate to the root router
      window.location.href = "/";

      // Clear the timeout if the cancel button is clicked
      clearTimeout(timeout);
    });

  // JavaScript for the Instagram button click
  document
    .getElementById("instagramButton")
    .addEventListener("click", function () {
      // Set the width and height to 1080px for Instagram
      document.getElementById("width").value = 1080;
      document.getElementById("height").value = 1080;

      // Set the image format to JPEG
      document.getElementById("format").value = "jpeg";
    });

  // JavaScript for the YouTube Thumbnail button click
  document
    .getElementById("youtubeThumbnailButton")
    .addEventListener("click", function () {
      // Set width and height for YouTube Thumbnail
      document.getElementById("width").value = 1280;
      document.getElementById("height").value = 720;

      // Set image format to JPEG
      document.getElementById("format").value = "jpeg";
    });

  // JavaScript for the LinkedIn Profile button click
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

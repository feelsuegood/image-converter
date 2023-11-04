// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  // Get references to the form and the processing text
  const processingText = document.getElementById("processingText");

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
    // Submit the form
    form.submit();
    // Disable the submit button
    submitButton.disabled = true;
    // Display the processingText
    processingText.style.display = "block";
    // Scroll through the screen to processingText.
    setTimeout(function () {
      processingText.scrollIntoView({ behavior: "smooth" });
    }, 100);
    // Display an alert message after a certain period of time and direct home page
    setTimeout(function () {
      alert("Please try again");
      submitButton.disabled = false;
      window.location.href = "/";
    }, 10000);
  });

  // Click event to 'cancelButton'
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

// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and the processing text
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");

  // Attach an event listener to the form submit action
  form.addEventListener("submit", function (e) {
    // Get reference to the file input element
    const fileInput = document.getElementById("image");

    // Check if any file is uploaded
    if (fileInput.files.length === 0) {
      console.log("No file uploaded");
      e.preventDefault();
      alert("Please upload an image file.");
      return;
    }

    // Display "Processing..." text when the form is submitted
    processingText.style.display = "block";
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
});

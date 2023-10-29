// * Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // * Get references to the form and the processing text
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");

  // * Attach an event listener to the form submit action
  form.addEventListener("submit", function (e) {
    // * Get reference to the file input element
    const fileInput = document.getElementById("image");

    // ! Check if any file is uploaded
    if (fileInput.files.length === 0) {
      // ! Log and show alert if no file is uploaded
      console.log("No file uploaded");
      e.preventDefault();
      alert("Please upload an image file.");
      return; // ! Exit the function early if no file is uploaded
    }

    // * Display "Processing..." text when the form is submitted
    processingText.style.display = "block";
  });
});

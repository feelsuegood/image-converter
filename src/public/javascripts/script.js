document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");

  form.addEventListener("submit", function (e) {
    const fileInput = document.getElementById("image");

    // Check if any file is uploaded
    if (fileInput.files.length === 0) {
      console.log("No file uploaded");
      e.preventDefault();
      alert("Please upload an image file.");
      return; // Exit the function early
    }

    // Display "Processing..." text when the form is submitted
    processingText.style.display = "block";
  });
});

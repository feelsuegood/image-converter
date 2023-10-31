// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and the processing text
  const form = document.querySelector("form");
  const processingText = document.getElementById("processingText");
  let timeout; // Define a variable to hold the timeout ID
  let formSubmitted = false; // Define a flag to track if the form has been submitted successfully
  let counter = 0; // Count the number of retries
  let maxRetries = 5; // Maximum number of retries

  form.addEventListener(
    "submit",
    function (e) {
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

      // Wait for 3 seconds before running the interval function
      setTimeout(function () {
        let interval = setInterval(function () {
          // Increment the counter
          counter++;
          // * Check if the form has been submitted or maximum retries reached
          if (formSubmitted || counter > maxRetries) {
            alert("Please try again");
            clearInterval(interval); // Stop the interval
            window.location.href = "/";
          } else {
            processingText.innerHTML = `Retrying... ${counter}/${maxRetries}`;
            form.submit(); // Manually submit the form again
          }
        }, 15000);
      });
    },
    5000
  );

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
});

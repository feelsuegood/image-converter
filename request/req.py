import threading
import requests
import time
import os
from typing import Any
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

url = os.getenv('URL_LB')
COCURRENT_REQUESTS = 3  # Max concurrent requests
ITERATION_REQUESTS = 100000  # Number of iterations
DELAY = 2  # Delay between requests in seconds
TIMEOUT = 7  # POST request timeout in seconds
RETRIES = 1  # Number of retries
MAX_ITERATION = 100  # Max threads
# Test maximum file size
FILE = 'test-10mb.jpg'  # Image file for upload
WIDTH = 1920  # Image width
HEIGHT = 1080  # Image height
FORMAT = 'JPEG'  # Image format


def thread_print(*args: Any, **kwargs: Any) -> None:
    """Thread-safe print function."""
    with threading.Lock():
        print(*args, **kwargs)


def perform_get(thread_number: int, total_threads: int) -> None:
    """Perform a GET request."""
    try:
        response = requests.get(url, timeout=TIMEOUT)
        if response.status_code == 200:
            thread_print(
                f'🧵 Thread {thread_number}/{total_threads} - 🔹 GET Successful')
        else:
            thread_print(
                f'🧵 Thread {thread_number}/{total_threads} - 🔴 GET Failed: {response.status_code}')
    except requests.exceptions.RequestException as e:
        thread_print(
            f'🧵 Thread {thread_number}/{total_threads} - 🟡 GET Error: {e}')


def perform_post(thread_number: int, total_threads: int) -> None:
    """Perform a POST request with image upload."""
    form_data = {'width': WIDTH,
                 'height': HEIGHT, 'format': FORMAT}

    for _ in range(RETRIES):
        try:
            # Start timing the request
            start_time = time.time()

            # Open image file for POST request
            with open(FILE, 'rb') as f:
                files = {'image': (FILE, f, 'image/jpeg')}
                response = requests.post(
                    f"{url}result", data=form_data, files=files, timeout=TIMEOUT)

            # Calculate elapsed time
            elapsed_time = time.time() - start_time

            # Print status and time
            if response.status_code == 200:
                thread_print(
                    f'🧵 Thread {thread_number}/{total_threads} - 🟢 POST Successful, Time elapsed: {elapsed_time:.2f} seconds')
                return

            thread_print(
                f'🧵 Thread {thread_number}/{total_threads} - 🔴 POST Failed: {response.status_code}, Time elapsed: {elapsed_time:.2f} seconds')

        except (requests.exceptions.RequestException, FileNotFoundError) as e:
            thread_print(
                f'🧵 Thread {thread_number}/{total_threads} - 🟡 POST Error: {e}')
            time.sleep(2)


def main(thread_number: int, total_threads: int, num_iterations: int, delay: int) -> None:
    """Main function to run GET and POST requests for each thread."""
    for i in range(num_iterations):
        thread_print(
            f'🧵 Thread {thread_number}/{total_threads} - ➡️   Iteration {i+1}/{num_iterations}')
        # perform_get(thread_number, total_threads)
        # time.sleep(delay)
        perform_post(thread_number, total_threads)
        time.sleep(delay)


def perform_multiple_requests(num_threads: int, num_iterations_per_thread: int, delay: int) -> None:
    """Run multiple threads to perform requests."""
    threads = []
    for i in range(min(MAX_ITERATION, num_threads)):
        thread = threading.Thread(target=main, args=(
            i+1, num_threads, num_iterations_per_thread, delay))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()


if __name__ == "__main__":
    # for _ in range(100):
    perform_multiple_requests(
        COCURRENT_REQUESTS, ITERATION_REQUESTS, DELAY)

from typing import Any
import os
import time
import requests
import threading
from dotenv import load_dotenv
load_dotenv()


url = os.getenv('REQUEST_URL')  # URL for POST requests
COCURRENT_REQUESTS = 1  # Max concurrent requests
ITERATION_REQUESTS = 1  # Number of iterations
DELAY_REQUESTS = 5  # Delay between requests in seconds
TIMEOUT = 25  # POST request timeout in seconds
RETRIES = 3  # Number of retries
MAX_THREADS = 100  # Max threads
WIDTH = 800  # Image width
HEIGHT = 800  # Image height
IMAGE_FILE = 'test-2mb.jpg'  # Image file for upload


# Thread-safe print function


def thread_print(*args: Any, **kwargs: Any) -> None:
    with threading.Lock():
        print(*args, **kwargs)


# Function to perform a GET request


def perform_get(thread_number: int) -> None:
    try:
        response = requests.get(url, timeout=TIMEOUT)
        if response.status_code == 200:
            thread_print(f'🧵 Thread {thread_number} - 🔹 GET Success')
        else:
            thread_print(
                f'🧵 Thread {thread_number} - 🔴 GET Failed: {response.status_code}')
    except requests.exceptions.RequestException as e:
        thread_print(
            f'🧵 Thread {thread_number} - 🟡 GET: An error occurred: {e}')

# Function to perform a POST request


def perform_post(thread_number: int) -> None:
    form_data = {'width': WIDTH, 'height': HEIGHT, 'format': 'jpeg'}
    for _ in range(RETRIES):
        try:
            start_time = time.time()  # Measure the time before starting the POST request

            with open(IMAGE_FILE, 'rb') as f:
                files = {'image': (IMAGE_FILE, f, 'image/jpeg')}
                response = requests.post(
                    f"{url}result", data=form_data, files=files, timeout=TIMEOUT)

            # Calculate elapsed time after completing the POST request
            elapsed_time = time.time() - start_time

            if response.status_code == 200:
                # Log elapsed time
                thread_print(
                    f'🧵 Thread {thread_number} - 🟢 POST Success, Time elapsed: {elapsed_time:.2f} seconds')
                return
            thread_print(
                f'🧵 Thread {thread_number} - 🔴 POST Failed: {response.status_code}, Time elapsed: {elapsed_time:.2f} seconds')  # Log elapsed time

        except (requests.exceptions.RequestException, FileNotFoundError) as e:
            # Calculate elapsed time after an error occurs
            elapsed_time = time.time() - start_time
            thread_print(
                f'🧵 Thread {thread_number} - 🟡 POST: An error occurred: {e}, Time elapsed: {elapsed_time:.2f} seconds')  # Log elapsed time
            time.sleep(2)

# Main function to perform alternating GET and POST requests


def main(thread_number: int, num_iterations: int, delay: int) -> None:
    for i in range(num_iterations):
        thread_print(
            f"🧵 Thread {thread_number} - ➡️  Iteration {i+1}/{num_iterations}")
        perform_get(thread_number)
        time.sleep(delay)
        perform_post(thread_number)
        time.sleep(delay)

# Function to perform multiple requests in parallel


def perform_multiple_requests(num_threads: int, num_iterations_per_thread: int, delay: int) -> None:
    threads = []
    for i in range(min(MAX_THREADS, num_threads)):  # Limit the number of threads
        thread = threading.Thread(target=main, args=(
            i+1, num_iterations_per_thread, delay))
        threads.append(thread)
        thread.start()
    for thread in threads:
        thread.join()


if __name__ == "__main__":
    # 1 thread, 100 iterations, 5 second delay
    perform_multiple_requests(
        COCURRENT_REQUESTS, ITERATION_REQUESTS, DELAY_REQUESTS)

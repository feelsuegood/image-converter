import threading
import requests
import time
import os
from dotenv import load_dotenv
from typing import Any

load_dotenv()

# Define the URL and other constants
url = os.getenv('REQUEST_URL')
RETRIES = 1
MAX_THREADS = 100
IMAGE_FILE = 'test-3mb.jpg'

# Thread-safe print function


def thread_print(*args: Any, **kwargs: Any) -> None:
    with threading.Lock():
        print(*args, **kwargs)

# Function to perform a GET request


def perform_get(thread_number: int) -> None:
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            thread_print(f'🧵 Thread {thread_number} - 🔹 GET Success')
        else:
            thread_print(
                f'🧵 Thread {thread_number} - 🔴 GET Failed: {response.status_code}')
    except requests.exceptions.RequestException as e:
        thread_print(
            f'🧵 Thread {thread_number} - 🔴 GET: An error occurred: {e}')

# Function to perform a POST request


def perform_post(thread_number: int) -> None:  # Added thread_number parameter
    form_data = {'width': 1920, 'height': 1080, 'format': 'PNG'}
    for _ in range(RETRIES):
        try:
            with open(IMAGE_FILE, 'rb') as f:
                files = {'image': (IMAGE_FILE, f, 'image/jpeg')}
                response = requests.post(
                    url, data=form_data, files=files, timeout=15)
                if response.status_code == 200:
                    thread_print(f'🧵 Thread {thread_number} - 🟢 POST Success')
                    return
                thread_print(
                    f'🧵 Thread {thread_number} - 🔴 POST Failed: {response.status_code}')
        except (requests.exceptions.RequestException, FileNotFoundError) as e:
            thread_print(
                f'🧵 Thread {thread_number} - 🔴 POST: An error occurred: {e}')
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
    perform_multiple_requests(4, 1000, 5)

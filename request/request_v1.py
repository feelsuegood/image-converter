import requests
import time
import os
from dotenv import load_dotenv
load_dotenv()

TIMEOUT = 90
WIDTH = 500
HEIGHT = 300
FORMAT = 'WEBP'
FILE = 'test-3mb.jpg'
ITERATION = 100000
DELAY = 1

# Define the URL
url = os.getenv('REQUEST_URL')


# Function to perform a GET request
def perform_get():
    try:
        response = requests.get(url, timeout=TIMEOUT)  # 10 seconds timeout
        if response.status_code == 200:
            print('🟢 GET Success')
        else:
            print(f'🔴 GET Failed: {response.status_code}, {response.text}')
    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')

# Function to perform a POST request


def perform_post():
    form_data = {
        'width': WIDTH,
        'height': HEIGHT,
        'format': FORMAT
    }
    try:
        with open(FILE, 'rb') as f:
            files = {'image': (
                FILE, f, 'image/jpeg')}
            start_time = time.time()
            response = requests.post(
                f'{url}result', data=form_data, files=files, timeout=TIMEOUT)
            end_time = time.time()
            elapsed_time = end_time - start_time

            if response.status_code == 200:
                print('🟢 POST Success')
                print(f'🟢 Elapsed time: {elapsed_time:.2f} seconds')
            else:
                print(
                    f'🔴 POST Failed: {response.status_code}')
    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')

# Main function to perform alternating GET and POST requests


def main(num_iterations, delay):
    for i in range(num_iterations):
        print(f"🔵 Iteration {i+1}/{num_iterations}")
        # perform_get()
        perform_post()
        # Add delay before the next request
        time.sleep(DELAY)


if __name__ == "__main__":
    main(ITERATION, DELAY)

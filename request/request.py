import requests
import time
import os
from dotenv import load_dotenv
load_dotenv()

# Define the URL
url = os.getenv('REQUEST_URL')

# Define the number of retries attempts of POST requests
retries = 3


# Function to perform a GET request
def perform_get():
    try:
        response = requests.get(url, timeout=10)  # 10 seconds timeout
        if response.status_code == 200:
            print('🟢 GET Success')
        else:
            print(f'🔴 GET Failed: {response.status_code}, {response.text}')
    except requests.exceptions.RequestException as e:
        print(f'🔴 GET: An error occurred: {e}')

# Function to perform a POST request


def perform_post():
    form_data = {
        'width': 1920,
        'height': 1080,
        'format': 'PNG'
    }
    for i in range(retries):
        try:
            with open('test-2mb.jpg', 'rb') as f:
                files = {'image': (
                    'test-2mb.jpg', f, 'image/jpeg')}
                start_time = time.time()
                response = requests.post(
                    url, data=form_data, files=files, timeout=10)
                end_time = time.time()
                elapsed_time = end_time - start_time

                if response.status_code == 200:
                    print('🟢 POST Success')
                    print(f'   Elapsed time: {elapsed_time:.2f} seconds')
                else:
                    print(
                        f'🔴 POST Failed: {response.status_code}, {response.text}')
                break  # if successful, break the loop
        except requests.exceptions.RequestException as e:
            print(f'🔴 POST: An error occurred: {e}')
            time.sleep(2)

# Main function to perform alternating GET and POST requests


def main(num_iterations, delay):
    for i in range(num_iterations):
        print(f"➡️  Iteration {i+1}/{num_iterations}")
        perform_get()
        # Add delay before the next request
        time.sleep(delay)
        perform_post()
        # Add delay before the next request
        time.sleep(delay)


if __name__ == "__main__":
    main(100000, 2)

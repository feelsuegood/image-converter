import requests
import time
import os
from dotenv import load_dotenv
load_dotenv()

# Define the URL
url = os.getenv('REQUEST_URL')

# Number of times to send the POST request
num_requests = 1000000000

# Delay between requests in seconds
# delay = 1

for i in range(num_requests):
    try:
        response = requests.get(url, timeout=10)  # 10 seconds timeout
        if response.status_code == 200:
            print(f'GET Success: {i+1}/{num_requests}')
        else:
            print(f'GET Failed: {response.status_code}, {response.text}')
        # Add delay before the next request
        # time.sleep(delay)
    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')

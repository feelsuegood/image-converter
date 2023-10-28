import requests
import time

# Define the URL
url = 'http://ec2-54-252-66-179.ap-southeast-2.compute.amazonaws.com:3000/'

# Prepare the data to be sent in the POST request
form_data = {
    'width': 1920,
    'height': 1080,
    'format': 'PNG'
}

# Number of times to send the POST request
num_requests = 100

# Delay between requests in seconds
delay = 2

for i in range(num_requests):
    try:
        # Open the file to be sent
        with open('test-2mb.jpg', 'rb') as f:
            files = {'image': ('test-2mb.jpg', f, 'image/jpeg')}

            # Record the start time
            start_time = time.time()

            # Send the POST request
            response = requests.post(
                url, data=form_data, files=files, timeout=50)

            # Record the end time
            end_time = time.time()

            # Calculate the elapsed time
            elapsed_time = end_time - start_time

            # Check the response
            if response.status_code == 200:
                print(f'Success {i+1}/{num_requests}')
                print(f'Elapsed time: {elapsed_time:.2f} seconds')
            else:
                print(
                    f'Failed {i+1}/{num_requests}: {response.status_code}, {response.text}')
        # Add delay before the next request
        time.sleep(delay)
    except requests.exceptions.RequestException as e:
        print(f'An error occurred on request {i+1}: {e}')

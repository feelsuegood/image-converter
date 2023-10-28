import requests

# Define the URL
url = 'http://ec2-54-252-66-179.ap-southeast-2.compute.amazonaws.com:3000/'


# Number of times to send the POST request
num_requests = 100000

for i in range(num_requests):
    try:
        response = requests.get(url, timeout=10)  # 10 seconds timeout
        if response.status_code == 200:
            print(f'GET Success: {i+1}/{num_requests}')
        else:
            print(f'GET Failed: {response.status_code}, {response.text}')
    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')

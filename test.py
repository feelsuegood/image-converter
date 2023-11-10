import requests
import os
import time
import concurrent.futures
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

BASE_URL = os.getenv('URL_CP14')
ITERATION = 2  # Number of iterations
CONCURRENT = 2  # Concurrent requests
DELAY = 1  # Delay between requests in seconds
FILE_PATH = 'test-img/test-10mb.jpg'  # Image file for upload
WIDTH = 1920  # Image width
HEIGHT = 1080  # Image height
FORMAT = 'jpeg'  # Image format


def get_presigned_url(base_url, format):
    url = f"{base_url}/presigned-url?format={format}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get presigned URL: {response.status_code}")


def post_image_processing(base_url, data):
    url = f"{base_url}/result"
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to process image: {response.status_code}")


def main():
    base_url = BASE_URL
    format = FORMAT

    # Get pre-signed URL
    presigned_data = get_presigned_url(base_url, format)
    if presigned_data:
        print("success to get presigned_data")
        # print(presigned_data)

    # Get the image conversion process
    data = {
        "key": "converted_37a0bb1f-b6f5-4ae4-8336-36f00ab29ba8.jpeg",
        "url": "https://cp14-s3.s3.ap-southeast-2.amazonaws.com/converted_37a0bb1f-b6f5-4ae4-8336-36f00ab29ba8.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA5DYSEEJ4Y2UDIELO%2F20231110%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20231110T002358Z&X-Amz-Expires=604800&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKj%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkYwRAIgP4gwNOcbEL%2BQyxk1rwgNaOYs7dFG5n7fKZpuTOzAtVsCIEMe2iECAmVVhPJ%2BdN8geymTi6lb9LZMfbvxFJ8XyfqtKq4DCOL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQAxoMOTAxNDQ0MjgwOTUzIgy6eC82WLLT7mdQIyUqggMrRXXVkTZ94JV6nmE5EQS3wPU3jDj1mh3djK5Byji29RdYJG2uN3wYLAauC%2FwSEN52FwrdbEh5OCSdfoA9VhhFQ7TIf9LVG08dpWo8QbSE3r7pqd7QMUCUX2mQJxHdAUmGQjDwMdmwN5QDdWL9y8KyHSW6zLdWVIL41kGEDRZxRfdLuGUpenk4if9az78APfuBIfACFYd0k50c%2FJ%2BaebOci%2BlcWs%2FIesJSoTX8hbM%2BXLIs4XPl8VEk2RCSWQyCEoWeyuCY%2Fgdd0mTZWFv5XFq%2FoEPHGZ8CS4cTxm444QcfIm4KbOwzXe%2Bj%2FDi5MTTw9YJlFfFwsI%2F9ycQxZGBB4T3K2qxE3GC8stj7rH6hwS1hZGPlBsgGWMbs6Z6%2FGpAXyfPQUHuc8YcWiViUUe9bJNUZS4ILfzYZ%2B04wWkpwh6SAgbDWifqiYhdXs5unhe8jjO%2BsoxDtVFWDQAt%2BTKkL1w91run1QP0F2ZcNkGFIJSB%2FCb1S4i2WcMQAkfB6tic6o85%2FNjDm77WqBjqnAb%2FlVYr9NYKbk0XPgqEgg8P%2Fjiw8XYDSCis8WCnhb2XYl9nefzOLoAzVD7vnC%2BJl%2FZi%2B%2B9ZW7TG2xwokXkXRgbBAM%2F6nDZIY1N69SKdpgwmL1eH7%2BRlUD3Aw5BobehnGtvx%2FOpgBHf9nqktQbYEleC5c9tnQRLgwP7M52zHX%2Botm0AWrDIKNGG6DQopeF1vE%2FX%2FJSTQsxs7pyZjER%2B9MkCh%2BwovEkOeE&X-Amz-Signature=1a87a59631004c7b0fb8f7bfcda4015ab1542318a50270e28c5b94379be965c0&X-Amz-SignedHeaders=host&x-id=GetObject",
        "width": WIDTH,
        "height": HEIGHT,
        "format": FORMAT
    }
    result_data = post_image_processing(base_url, data)
    if result_data:
        print("success to get result_data")
        # print(result_data)
    time.sleep(DELAY)


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT) as executor:
        futures = [executor.submit(main) for _ in range(ITERATION)]
        # Delay between requests
        for future in concurrent.futures.as_completed(futures):
            future.result()

import requests
import os
import concurrent.futures
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

url = os.getenv('URL_LB')
# Get the pre-signed URL from the server


MAX_WORKERS = 3  # Max concurrent requests

TIME = 100000  # Number of iterations
# Test maximum file size
FILE_PATH = 'test-img/test-10mb.jpg'  # Image file for upload
WIDTH = 1920  # Image width
HEIGHT = 1080  # Image height
FORMAT = 'jpeg'  # Image format


def get_presigned_url(format):
    response = requests.get(
        f"{url}presigned-url?format={format}")
    if response.status_code == 200:
        return response.json()
    else:
        response.raise_for_status()

# Upload the image to the pre-signed URL


def upload_image_to_s3(file_path, upload_data):
    with open(file_path, 'rb') as file:
        files = {'file': (file_path, file)}
        headers = {'Content-Type': f"image/{upload_data['format']}"}
        response = requests.put(upload_data['url'], data=file, headers=headers)
        if response.status_code == 200:
            print("🟢 Upload successful")
        else:
            response.raise_for_status()

# Send the image processing request


def process_image(upload_data):
    payload = {
        'key': upload_data['key'],
        'url': upload_data['url'],
        'width': upload_data['width'],
        'height': upload_data['height'],
        'format': upload_data['format']
    }
    headers = {'Content-Type': 'application/json'}
    response = requests.post(f"{url}result",
                             json=payload, headers=headers)
    if response.status_code == 200:
        print("🟢 key(filename)")
        return response.json().get('key')
    else:
        response.raise_for_status()
# Main function to handle the upload process


def main():
    # Example values
    width = WIDTH
    height = HEIGHT
    format = FORMAT
    file_path = FILE_PATH

    try:
        # Get the pre-signed URL
        upload_data = get_presigned_url(format)
        upload_data['width'] = width
        upload_data['height'] = height
        upload_data['format'] = format

        # Upload the image
        upload_image_to_s3(file_path, upload_data)

        # Process the image
        result = process_image(upload_data)
        print(result)

    except requests.exceptions.RequestException as e:
        print(e)


# 병렬 실행과 반복을 관리하는 함수
def run_in_parallel(times, max_workers):
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # main 함수를 times 횟수만큼 실행하도록 예약
        futures = {executor.submit(main) for _ in range(times)}
        # 완료될 때까지 기다리고 결과를 반환
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()  # 결과(에러가 있다면 여기서 예외가 발생함)
            except Exception as e:
                print(f"An error occurred: {e}")


if __name__ == "__main__":
    run_in_parallel(times=TIME, max_workers=MAX_WORKERS)

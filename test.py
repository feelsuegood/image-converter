import requests


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
    base_url = "http://imageConverter-1790894553.ap-southeast-2.elb.amazonaws.com"
    format = "jpeg"

    # 사전 서명된 URL을 얻는 부분
    presigned_data = get_presigned_url(base_url, format)
    print(presigned_data)

    # 이미지 처리 결과를 얻는 부분
    data = {
        "key": presigned_data["key"],
        "url": presigned_data["url"],
        "width": 800,
        "height": 600,
        "format": format
    }
    result_data = post_image_processing(base_url, data)
    print(result_data)


if __name__ == "__main__":
    main()

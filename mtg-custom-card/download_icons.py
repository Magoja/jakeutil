import os
import requests
import time

base_url = "https://mtgcardsmith.com/wp-content/themes/hello-elementor-child/images/"
output_dir = "/Users/magoja/Documents/project/jakeutil/mtg-custom-card/icons"

def download_file(filename):
    url = base_url + filename
    filepath = os.path.join(output_dir, filename)
    print(f"Downloading {filename}...")
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(r.content)
        else:
            print(f"Failed to download {filename}: {r.status_code}")
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
    time.sleep(0.1)

# icon1 to icon5
# Renaming to icon-X for consistency
for i in range(1, 6):
    url = base_url + f"icon{i}.png"
    filepath = os.path.join(output_dir, f"icon-{i}.png")
    print(f"Downloading {url} to {filepath}...")
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(r.content)
    except Exception as e:
        print(e)
    time.sleep(0.1)

# icon-6 to icon-53
for i in range(6, 54):
    download_file(f"icon-{i}.png")

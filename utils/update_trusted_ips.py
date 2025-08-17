import time
import requests
import json
import sys
import os

# ----------- Setup Log File Redirect (FIRST) -----------
log_path = "C:/Users/pc/Desktop/EDR-2/update_log.txt"
os.makedirs(os.path.dirname(log_path), exist_ok=True)

sys.stdout = open(log_path, "a")
sys.stderr = sys.stdout
print("\n---- Script Run at:", time.ctime(), "----")

# ----------- Source IP Ranges -----------
sources = {
    "Cloudflare": "https://www.cloudflare.com/ips-v4",
    "Googlebot": "https://developers.google.com/search/apis/ipranges/googlebot.json",
    "AWS": "https://ip-ranges.amazonaws.com/ip-ranges.json",
        "Oracle": "https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json"
}

def fetch_cloudflare():
    try:
        response = requests.get(sources["Cloudflare"])
        return response.text.splitlines()
    except Exception as e:
        print("[!] Failed to fetch Cloudflare IPs:", e)
        return []

def fetch_google():
    try:
        response = requests.get(sources["Googlebot"])
        data = response.json()
        return [item['ipv4Prefix'] for item in data['prefixes'] if 'ipv4Prefix' in item]
    except Exception as e:
        print("[!] Failed to fetch Googlebot IPs:", e)
        return []

def fetch_aws(allowed_services=["S3", "EC2", "CLOUDFRONT", "LAMBDA"]):
    try:
        response = requests.get(sources["AWS"])
        data = response.json()
        return [
            item['ip_prefix'] for item in data['prefixes']
            if item['service'] in allowed_services and 'ip_prefix' in item
        ]
    except Exception as e:
        print("[!] Failed to fetch AWS IPs:", e)
        return []
    
def fetch_oracle():
    try:
        response = requests.get(sources["Oracle"])
        data = response.json()
        cidrs = []
        for region in data.get("regions", []):
            for block in region.get("cidrs", []):
                if "cidr" in block:
                    cidrs.append(block["cidr"])
        return cidrs
    except Exception as e:
        print("[!] Failed to fetch Oracle IPs:", e)
        return []

def main():
    trusted_ips = set()

    # Fetch IPs
    trusted_ips.update(fetch_cloudflare())
    trusted_ips.update(fetch_google())
    trusted_ips.update(fetch_aws())
    trusted_ips.update(fetch_oracle())

    print(f"[+] Fetched {len(trusted_ips)} total trusted IPs")

    # Save JSON
    output_path = "C:/Users/pc/Desktop/EDR-2/agent/trusted_ips.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        with open(output_path, "w") as f:
            json.dump(sorted(trusted_ips), f, indent=4)
            print(f"[OK] Saved {len(trusted_ips)} IP ranges to trusted_ips.json")
    except Exception as e:
        print("[!] Failed to save file:", e)

# ----------- Main Entry -----------
if __name__ == "__main__":
    main()

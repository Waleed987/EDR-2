import subprocess
import os

def update_signaturebase():
    repo_dir = "C:/Users/pc/Desktop/EDR-2/agent/signature-base"
    if os.path.exists(repo_dir):
        subprocess.run(["git", "-C", repo_dir, "pull"])
        print("[+] SignatureBase rules updated.")
    else:
        print("[!] Repo not found. Did you clone it?")

if __name__ == "__main__":
    update_signaturebase()

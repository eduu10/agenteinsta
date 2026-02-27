#!/usr/bin/env python3
"""
Local Instagram Login Script
=============================
Run this on YOUR computer (not on the server) to login to Instagram
and export the session. The session can then be imported into the
dashboard so the server can use it without logging in from its IP.

Usage:
    python login_local.py

It will:
1. Ask for your Instagram username and password
2. Login from your local IP (not blocked)
3. Export the session JSON
4. Automatically upload it to the backend API
"""
import json
import getpass
import sys

try:
    from instagrapi import Client
except ImportError:
    print("Installing instagrapi...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "instagrapi"])
    from instagrapi import Client

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests


def main():
    print("=" * 50)
    print("  Instagram Local Login - Session Export")
    print("=" * 50)
    print()

    username = input("Instagram username: ").strip()
    password = getpass.getpass("Instagram password: ")

    print(f"\nLogging in as @{username}...")

    client = Client()
    client.delay_range = [1, 3]

    try:
        client.login(username, password)
        print(f"Login successful! Logged in as @{username}")
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

    # Export session
    session_json = json.dumps(client.get_settings())
    print(f"\nSession exported ({len(session_json)} bytes)")

    # Save locally
    with open("ig_session.json", "w") as f:
        f.write(session_json)
    print("Session saved to ig_session.json")

    # Ask to upload
    print()
    api_url = input("Backend API URL (default: https://agenteinsta-1.onrender.com): ").strip()
    if not api_url:
        api_url = "https://agenteinsta-1.onrender.com"

    print(f"\nUploading session to {api_url}/api/settings/import-session ...")

    try:
        # First update username
        resp = requests.put(
            f"{api_url}/api/settings",
            json={"ig_username": username, "ig_password": password},
        )
        if resp.status_code == 200:
            print("Username/password saved to settings")

        # Then import session
        resp = requests.post(
            f"{api_url}/api/settings/import-session",
            json={"session_json": session_json},
        )
        if resp.status_code == 200:
            print("Session uploaded successfully!")
        else:
            print(f"Upload failed: {resp.status_code} - {resp.text}")
            print("\nYou can manually import the session via the API:")
            print(f'curl -X POST {api_url}/api/settings/import-session -H "Content-Type: application/json" -d @ig_session.json')

        # Test connection
        print("\nTesting connection via server...")
        resp = requests.post(f"{api_url}/api/settings/test-connection")
        result = resp.json()
        if result.get("success"):
            print(f"Connection test PASSED! Account: @{result['account']['username']}")
            print(f"Followers: {result['account']['follower_count']}")
        else:
            print(f"Connection test failed: {result.get('error')}")
            print("The session may have expired. Try running this script again.")

    except Exception as e:
        print(f"Error uploading: {e}")
        print("\nSession saved locally in ig_session.json - you can import it manually.")

    print("\nDone!")


if __name__ == "__main__":
    main()

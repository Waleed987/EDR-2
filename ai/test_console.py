#!/usr/bin/env python3
"""
Test script to verify console window behavior
"""

import time
import sys

print("🔧 CONSOLE TEST STARTED")
print("="*50)
print("This console should stay open for 10 seconds")
print("If you see this, the console window is working!")
print("="*50)

try:
    for i in range(10, 0, -1):
        print(f"⏱️  Closing in {i} seconds...", end="\r")
        time.sleep(1)
except KeyboardInterrupt:
    print("\n👋 Interrupted by user")

print("\n🚪 Console closing now...")
sys.exit(0)

Windows Network Quick Switcher (v2)
===================================

What’s new in v2
----------------
• Purges any APIPA (169.254.x.x) addresses before applying your static profile.
• Accepts command-line profile args so the .bat files are truly one-click.
• Clears old default routes & stale static IPs before applying new ones.

Files
-----
• net-profile-switch.ps1  → Interactive or arg-driven (1/2/3)
• set-hmi-10.27.168.bat   → One-click static: 10.27.168.50/24 gw 10.27.168.1, DNS 10.27.168.252
• set-hmi-10.20.149.bat   → One-click static: 10.20.149.150/26 gw 10.20.149.129
• set-dhcp.bat            → One-click revert to DHCP
• README.txt

How to run
----------
Option A: Double‑click a .bat file (it will elevate to admin and run).
Option B: Right‑click net-profile-switch.ps1 → Run with PowerShell (or):
          Start PowerShell as admin and run:
              Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
              .\net-profile-switch.ps1

Notes
-----
- The script auto-detects your active **wired** adapter (Status=Up, excludes Wi‑Fi/Bluetooth).
- You can edit addresses inside the scripts later if your subnets change.

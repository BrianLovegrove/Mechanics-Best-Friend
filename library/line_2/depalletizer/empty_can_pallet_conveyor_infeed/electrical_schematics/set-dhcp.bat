@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb runAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0net-profile-switch.ps1\" -Profile 3'"

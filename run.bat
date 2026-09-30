@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8765"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run.ps1" -Port %PORT%

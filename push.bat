@echo off
rem Chạy push.sh bằng Git Bash. Bấm đúp file này hoặc kéo file này vào cửa sổ CMD.
rem Tự tìm bash.exe ở các vị trí cài Git phổ biến, nếu không có thì dùng bash trong PATH.
cd /d "%~dp0"
set "BASH="
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH if exist "D:\Git\bin\bash.exe" set "BASH=D:\Git\bin\bash.exe"
if not defined BASH set "BASH=bash"
"%BASH%" push.sh
echo.
pause

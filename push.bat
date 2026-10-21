@echo off
rem Chay push.sh bang Git Bash. Bam dup file nay hoac keo file nay vao cua so CMD.
rem Tu tim bash.exe o cac vi tri cai Git pho bien, neu khong co thi dung bash trong PATH.
cd /d "%~dp0"
set "BASH="
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH if exist "D:\Git\bin\bash.exe" set "BASH=D:\Git\bin\bash.exe"
if not defined BASH set "BASH=bash"
"%BASH%" push.sh
echo.
pause

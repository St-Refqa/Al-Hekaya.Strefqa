@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ====================================================
echo        🚀 Syncing files and preparing updates...      
echo ====================================================

node sync_workshops.js

echo ====================================================
echo        🚀 Uploading updates to the website...      
echo ====================================================

git add .
git commit -m "Auto update from desktop"
git push

echo ====================================================
echo  ✅ Done! 
echo  ⏳ Please wait 1-2 minutes and refresh the website.
echo ====================================================
pause

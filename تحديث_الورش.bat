@echo off
echo ==================================================
echo جاري نسخ الملفات الجديدة من مجلد حل الورش...
echo ==================================================
cd /d "E:\St Refqa\AL Hkaya\WebSite\New"

REM Copy all files forcefully from the original folder to the public folder
xcopy "E:\St Refqa\AL Hkaya\WebSite\New\حل الورش\*" "E:\St Refqa\AL Hkaya\WebSite\New\public\workshops\" /Y /E

echo.
echo جاري تحديث فهرس الصور...
node generate-workshops.js

echo.
echo جاري رفع التحديثات على الإنترنت (Vercel)...
git add public/workshops/*
git add generate-workshops.js
git commit -m "Update workshops gallery"
git push origin main

echo.
echo ==================================================
echo تم التحديث بنجاح! التغييرات هتظهر على الموقع في خلال دقيقتين.
echo ==================================================
pause

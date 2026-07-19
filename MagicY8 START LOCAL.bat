@echo off
setlocal
cd /d "%~dp0"
set "npm_config_cache=%~dp0.npm-cache"
set "npm_config_audit=false"
set "npm_config_fund=false"
set "npm_config_update_notifier=false"
title MagicY8 Local Server
echo.
echo MagicY8 is starting on this PC...
echo.
echo Open this link after the server says "ready":
echo http://localhost:5173/
echo.
echo Keep this window open while using the website.
echo Close this window to stop the website.
echo.
"F:\APP\node.js\npm.cmd" run dev:share -- --port 5173
pause

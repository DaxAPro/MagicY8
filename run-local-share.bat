@echo off
cd /d "%~dp0"
set "npm_config_cache=%~dp0.npm-cache"
F:\APP\node.js\npm.cmd run dev:share -- --port 5173

@echo off
cd /d "%~dp0"
F:\APP\Microsoft VS Code\bin\code.cmd --user-data-dir "%~dp0.vscode-user-data" --extensions-dir "%~dp0.vscode-extensions" "%~dp0"

@echo off
cd /d %~dp0
echo Lancement de Nizua Loader...
start "" "%~dp0node_modules\.bin\electron.cmd" .

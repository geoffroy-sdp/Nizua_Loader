@echo off
setlocal
cd /d %~dp0

echo ================================
echo 🔍 Vérification de Node.js...
echo ================================
node --version >nul 2>&1
if %errorlevel% NEQ 0 (
    echo Node.js non trouvé. Téléchargement...
    powershell -Command "Start-BitsTransfer -Source https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi -Destination node-installer.msi"
    echo Installation de Node.js...
    start /wait msiexec /i node-installer.msi /quiet
    del node-installer.msi
)

echo.
echo ================================
echo 🔍 Vérification de Python...
echo ================================
python --version >nul 2>&1
if %errorlevel% NEQ 0 (
    echo Python 3.10+ non trouvé. Téléchargement...
    powershell -Command "Start-BitsTransfer -Source https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe -Destination python-installer.exe"
    echo Installation de Python...
    start /wait python-installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    del python-installer.exe
)

echo.
echo ================================
echo 📦 Installation des modules Node.js...
echo ================================
call npm install

echo.
echo ================================
echo 🐍 Installation des dépendances Python...
echo ================================
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo ✅ Configuration terminée. Vous pouvez lancer Nizua Loader.
timeout /t 3 >nul
exit

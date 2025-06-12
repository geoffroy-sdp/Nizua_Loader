const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: false,
    resizable: true, 
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    title: 'Nizua Loader',
    icon: path.join(__dirname, 'assets/icon.ico')
  });

  mainWindow.loadFile('src/index.html');
  
  // Menu.setApplicationMenu(null); //pour le rendre comme une app (non dev)

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonServer() {
  const isDev = process.argv.includes('--dev');
  const serverScript = isDev
    ? path.join(__dirname, '../backend/server.py')
    : path.join(process.resourcesPath, 'server.exe');

  const spawnArgs = isDev
    ? ['python', [serverScript]]
    : [serverScript];

  pythonProcess = spawn(...spawnArgs);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python server: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python server error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python server exited with code ${code}`);
  });
}

ipcMain.handle('get-server-status', async () => {
  try {
    return { status: 'running', port: 5000 };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
});

ipcMain.handle('get-lobby-count', () => {
  return { count: 0 };
});


function runInstallScriptIfNeeded() {
  const flagPath = path.join(app.getPath('userData'), 'dependencies_installed.flag');

  if (!fs.existsSync(flagPath)) {
    const scriptPath = path.join(process.resourcesPath, 'install_dependencies.bat');

    const installProcess = spawn('cmd.exe', ['/c', scriptPath], {
      cwd: process.resourcesPath,
      detached: true,
      shell: true
    });

    installProcess.stdout.on('data', (data) => {
      console.log(`Install script: ${data}`);
    });

    installProcess.stderr.on('data', (data) => {
      console.error(`Install script error: ${data}`);
    });

    installProcess.on('exit', (code) => {
      console.log(`Install script exited with code ${code}`);
      fs.writeFileSync(flagPath, 'done');
    });
  }
}

app.whenReady().then(() => {
  runInstallScriptIfNeeded();
  createWindow();
  startPythonServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

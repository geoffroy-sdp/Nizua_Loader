const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Charge l’URL du service de cloud gaming
  win.loadURL('https://www.xbox.com/en-US/play/launch/call-of-duty-black-ops-6---cross-gen-bundle/9PF528M6CRHQ');

  // Attendre que le contenu soit prêt
  win.webContents.on('did-finish-load', async () => {
    try {
      const debugSession = win.webContents.debugger;
      debugSession.attach('1.3');

      // Simule un écran de 640x320
      debugSession.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 640,
        height: 320,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: 640,
        screenHeight: 320,
        screenOrientation: {
          type: "landscapePrimary",
          angle: 0
        }
      });

      console.log("🎯 Fake resolution 640x320 set.");
    } catch (e) {
      console.error("Debugger error:", e);
    }
  });
});

const { contextBridge, ipcRenderer } = require('electron');

// Expose des API sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  getLobbyCount: () => ipcRenderer.invoke('get-lobby-count'),
  
  // Événements pour la communication avec le serveur Python
  onServerMessage: (callback) => ipcRenderer.on('server-message', callback),
  removeServerListener: (callback) => ipcRenderer.removeListener('server-message', callback)
});
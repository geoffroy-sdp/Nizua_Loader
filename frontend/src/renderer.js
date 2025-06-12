// Main Renderer - Simplified entry point that initializes the modular app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main application
    window.nizuaApp = new NizuaApp();
    
    // Keep global reference for backward compatibility
    window.nizuaLoader = {
        switchTab: (tabId) => window.uiManager.switchTab(tabId),
        closeLobby: (lobbyId) => window.lobbyManager.closeLobby(lobbyId),
        refreshLobby: (lobbyId) => window.lobbyManager.refreshLobby(lobbyId)
    };
});
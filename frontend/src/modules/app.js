// Main Application Module - Orchestrates all other modules
class NizuaApp {
    constructor() {
        this.serverUrl = 'http://127.0.0.1:5000';
        this.init();
    }

    async init() {
        // Initialize all managers
        this.uiManager = new UIManager();
        this.controllerManager = new ControllerManager();
        this.gamepadInjector = new GamepadInjector();
        this.lobbyManager = new LobbyManager(this.gamepadInjector);
        this.settingsManager = new SettingsManager();

        // Make managers globally accessible
        window.uiManager = this.uiManager;
        window.controllerManager = this.controllerManager;
        window.lobbyManager = this.lobbyManager;
        window.settingsManager = this.settingsManager;

        // Setup UI
        this.setupEventListeners();
        this.setupTabSystem();
        
        // Initialize server connection and settings
        await this.checkServerStatus();
        await this.settingsManager.loadSettings();
        await this.controllerManager.updateControllerStatus();

        // Start periodic updates
        this.startPeriodicUpdates();

        console.log('Nizua Loader initialized successfully');
    }

    setupEventListeners() {
        // Lobby management buttons
        const openLobbyBtn = document.getElementById('open-lobby-btn');
        const closeAllLobbiesBtn = document.getElementById('close-all-lobbies-btn');
        const refreshAllLobbiesBtn = document.getElementById('refresh-all-lobbies-btn');
        
        openLobbyBtn.addEventListener('click', () => this.handleOpenLobbies());
        closeAllLobbiesBtn.addEventListener('click', () => this.handleCloseAllLobbies());
        refreshAllLobbiesBtn.addEventListener('click', () => this.handleRefreshAllLobbies());

        // Controller buttons
        const enableMovementBtn = document.getElementById('enable-movement-btn');
        const selectClassBtn = document.getElementById('select-class-btn');
        const enableAntiAfkBtn = document.getElementById('enable-anti-afk-btn');

        enableMovementBtn.addEventListener('click', () => this.handleToggleMovement());
        selectClassBtn.addEventListener('click', () => this.handleSelectClass());
        enableAntiAfkBtn.addEventListener('click', () => this.handleToggleAntiAfk());

        // Tab management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.uiManager.switchTab(e.target.dataset.tab);
            }
        });
    }

    setupTabSystem() {
        this.uiManager.createLobbyTab();
        this.settingsManager.setupSliderEvents();
        this.settingsManager.setupButtons();
    }

    async handleOpenLobbies() {
        const lobbyCountInput = document.getElementById('lobby-count');
        const requestedCount = parseInt(lobbyCountInput.value);
        
        const openLobbyBtn = document.getElementById('open-lobby-btn');
        openLobbyBtn.disabled = true;
        openLobbyBtn.textContent = 'Ouverture...';

        try {
            const openedCount = await this.lobbyManager.openLobbies(requestedCount);
            this.uiManager.showNotification(`${openedCount} lobby(s) et manette(s) ouvert(s) avec succès`);
            this.uiManager.switchTab('lobby');
            this.updateLobbyList();
        } catch (error) {
            console.error('Erreur:', error);
            this.uiManager.showNotification(error.message, 'error');
        } finally {
            openLobbyBtn.disabled = false;
            openLobbyBtn.textContent = 'Open Lobby(s)';
        }
    }

    async handleCloseAllLobbies() {
        const lobbiesCount = this.lobbyManager.getLobbyCount();
        
        if (lobbiesCount === 0) {
            this.uiManager.showNotification('Aucun lobby à fermer', 'error');
            return;
        }

        const closedCount = this.lobbyManager.closeAllLobbies();
        this.uiManager.showNotification(`${closedCount} lobby(s) fermé(s)`);
        this.updateLobbyList();
    }

    async handleRefreshAllLobbies() {
        const lobbiesCount = this.lobbyManager.getLobbyCount();
        
        if (lobbiesCount === 0) {
            this.uiManager.showNotification('Aucun lobby à actualiser', 'error');
            return;
        }

        const refreshedCount = this.lobbyManager.refreshAllLobbies();
        this.uiManager.showNotification(`${refreshedCount} lobby(s) actualisé(s)`);
    }

    async handleToggleMovement() {
        try {
            const result = await this.controllerManager.toggleMovement();
            this.uiManager.showNotification(result.message);
        } catch (error) {
            this.uiManager.showNotification(error.message, 'error');
        }
    }

    async handleSelectClass() {
        try {
            const result = await this.controllerManager.selectClass();
            this.uiManager.showNotification(result.message);
        } catch (error) {
            this.uiManager.showNotification(error.message, 'error');
        }
    }

    async handleToggleAntiAfk() {
        try {
            const result = await this.controllerManager.toggleAntiAfk();
            this.uiManager.showNotification(result.message);
        } catch (error) {
            this.uiManager.showNotification(error.message, 'error');
        }
    }

    async checkServerStatus() {
        try {
            const status = await window.apiClient.getServerStatus();
            this.uiManager.updateServerStatus({ status: 'running', port: 5000 });
        } catch (error) {
            console.error('Erreur lors de la vérification du serveur:', error);
            this.uiManager.updateServerStatus({ status: 'error', error: error.message });
        }
    }

    updateLobbyList() {
        const lobbies = this.lobbyManager.getLobbies();
        this.uiManager.updateLobbyList(lobbies);
    }

    startPeriodicUpdates() {
        setInterval(() => {
            this.checkServerStatus();
            this.controllerManager.updateControllerStatus();
        }, 30000);
    }
}

// Export for global access
window.NizuaApp = NizuaApp;
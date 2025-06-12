// Lobby Manager Module - Enhanced with session management
class LobbyManager {
    constructor(gamepadInjector) {
        this.lobbies = [];
        this.maxLobbies = 20;
        this.gameUri = "https://www.xbox.com/en-US/play/launch/call-of-duty-black-ops-6---cross-gen-bundle/9PF528M6CRHQ";
        this.gamepadInjector = gamepadInjector;
        this.sessionManager = new SessionManager();
    }

    async openLobbies(requestedCount) {
        if (requestedCount < 1 || requestedCount > this.maxLobbies) {
            throw new Error(`Nombre de lobbies invalide (1-${this.maxLobbies})`);
        }

        const currentCount = this.lobbies.length;
        const totalCount = currentCount + requestedCount;
        
        if (totalCount > this.maxLobbies) {
            throw new Error(`Maximum ${this.maxLobbies} lobbies autorisés`);
        }

        for (let i = 0; i < requestedCount; i++) {
            const lobbyId = `lobby${this.lobbies.length + 1}`;
            this.lobbies.push(lobbyId);
            await this.createLobbyInstance(lobbyId);
            await this.connectControllerForLobby(lobbyId);
        }

        this.updateLobbyDisplay();
        return requestedCount;
    }

    async createLobbyInstance(lobbyId) {
        const lobbyNumber = this.lobbies.length;
        const lobbyGrid = document.getElementById('lobby-grid');
        
        // Remove "no lobbies" message if it exists
        const noLobbies = lobbyGrid.querySelector('.no-lobbies');
        if (noLobbies) {
            noLobbies.remove();
        }

        const lobbyInstance = document.createElement('div');
        lobbyInstance.className = 'lobby-instance-16x9';
        lobbyInstance.id = `instance-${lobbyId}`;
        lobbyInstance.style.cssText = `
            width: 480px;
            height: 320px;
            display: inline-block;
            margin: 15px;
            vertical-align: top;
            border: 1px solid var(--primary-color);
            border-radius: 8px;
            background: rgba(26, 10, 46, 0.8);
            box-shadow: 0 0 20px rgba(138, 43, 226, 0.2);
        `;

        lobbyInstance.innerHTML = this.getLobbyInstanceHTML(lobbyId, lobbyNumber);
        lobbyGrid.appendChild(lobbyInstance);
        
        // Setup webview and gamepad injection
        setTimeout(() => {
            this.setupLobbyWebview(lobbyId);
        }, 500);
    }

    getLobbyInstanceHTML(lobbyId, lobbyNumber) {
        return `
            <div class="lobby-instance-header-mini" style="
                padding: 10px; 
                background: rgba(138, 43, 226, 0.1); 
                border-radius: 8px 8px 0 0; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                height: 40px;
                border-bottom: 1px solid rgba(138, 43, 226, 0.3);
            ">
                <h4 style="margin: 0; font-size: 16px; color: var(--primary-color); font-family: 'Orbitron', monospace;">Lobby ${lobbyNumber}</h4>
                <div style="display: flex; gap: 8px;">
                    <button id="auto-play-${lobbyId}" class="auto-play-btn" style="
                        padding: 4px 8px;
                        font-size: 12px;
                        background: rgba(76, 175, 80, 0.8);
                        color: white;
                        border: 1px solid #4CAF50;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " title="Trigger Auto-Play">▶️</button>
                    <button id="test-gamepad-${lobbyId}" class="test-gamepad-btn" style="
                        padding: 4px 8px;
                        font-size: 12px;
                        background: rgba(138, 43, 226, 0.8);
                        color: white;
                        border: 1px solid var(--primary-color);
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " title="Tester Gamepad">🎮</button>
                </div>
            </div>
            <div class="webview-container-16x9" style="padding: 8px; position: relative; background: rgba(0, 0, 0, 0.5);">
                <webview id="${lobbyId}-webview" 
                         src="${this.gameUri}" 
                         partition="persist:${lobbyId}"
                         style="width: 464px; height: 264px; border: none; border-radius: 4px;"></webview>
                <div class="expand-icon" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    width: 32px;
                    height: 32px;
                    background: rgba(138, 43, 226, 0.8);
                    border-radius: 6px;
                    display: none;
                    cursor: pointer;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 18px;
                    z-index: 100;
                    border: 1px solid var(--primary-color);
                    transition: all 0.3s ease;
                " title="Agrandir">⛶</div>
                <div class="session-status" style="
                    position: absolute;
                    bottom: 15px;
                    left: 15px;
                    background: rgba(0, 0, 0, 0.8);
                    color: #4CAF50;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    border: 1px solid #4CAF50;
                    font-weight: 500;
                " id="session-status-${lobbyId}">🎮 Session Active</div>
            </div>
        `;
    }

    setupLobbyWebview(lobbyId) {
        const webview = document.getElementById(`${lobbyId}-webview`);
        if (!webview) return;

        // Initialize session management
        this.sessionManager.initializeWebviewSession(webview, lobbyId);

        // Inject gamepad API
        this.gamepadInjector.injectGamepadAPI(webview, lobbyId);

        // Setup resolution spoofing with enhanced error handling
        webview.addEventListener('did-finish-load', () => {
            setTimeout(() => {
                this.setupResolutionSpoofing(webview, lobbyId);
            }, 2000);
        });

        // Setup UI interactions
        this.setupLobbyInteractions(lobbyId);
    }

    setupResolutionSpoofing(webview, lobbyId) {
        try {
            // Check if debugger API is available
            if (!webview.debugger) {
                console.log(`⚠️ Debugger API non disponible pour ${lobbyId} - utilisation de méthode alternative`);
                this.setupAlternativeResolution(webview, lobbyId);
                return;
            }

            // Check if debugger is already attached
            let isAttached = false;
            try {
                isAttached = webview.debugger.isAttached();
            } catch (error) {
                console.log(`⚠️ Impossible de vérifier l'état du debugger pour ${lobbyId}:`, error.message);
                this.setupAlternativeResolution(webview, lobbyId);
                return;
            }

            // Attach debugger if not already attached
            if (!isAttached) {
                try {
                    webview.debugger.attach('1.3');
                } catch (error) {
                    console.log(`⚠️ Impossible d'attacher le debugger pour ${lobbyId}:`, error.message);
                    this.setupAlternativeResolution(webview, lobbyId);
                    return;
                }
            }

            // Apply device metrics override
            try {
                webview.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
                    width: 464,
                    height: 264,
                    deviceScaleFactor: 1,
                    mobile: false,
                    screenWidth: 464,
                    screenHeight: 264,
                    screenOrientation: {
                        type: "landscapePrimary",
                        angle: 0
                    }
                });
                console.log(`✅ Résolution spoofée (464x264) sur ${lobbyId}`);
            } catch (error) {
                console.log(`⚠️ Erreur lors de l'application du spoof résolution ${lobbyId}:`, error.message);
                this.setupAlternativeResolution(webview, lobbyId);
            }
        } catch (error) {
            console.error(`❌ Erreur générale spoof résolution ${lobbyId}:`, error);
            this.setupAlternativeResolution(webview, lobbyId);
        }
    }

    setupAlternativeResolution(webview, lobbyId) {
        // Alternative method using CSS and viewport meta injection
        const resolutionScript = `
            (function() {
                try {
                    // Set viewport meta tag
                    let viewportMeta = document.querySelector('meta[name="viewport"]');
                    if (!viewportMeta) {
                        viewportMeta = document.createElement('meta');
                        viewportMeta.name = 'viewport';
                        document.head.appendChild(viewportMeta);
                    }
                    viewportMeta.content = 'width=464, height=264, initial-scale=1.0, user-scalable=no';
                    
                    // Override screen properties
                    Object.defineProperty(screen, 'width', { value: 464, configurable: true });
                    Object.defineProperty(screen, 'height', { value: 264, configurable: true });
                    Object.defineProperty(screen, 'availWidth', { value: 464, configurable: true });
                    Object.defineProperty(screen, 'availHeight', { value: 264, configurable: true });
                    
                    // Override window properties
                    Object.defineProperty(window, 'innerWidth', { value: 464, configurable: true });
                    Object.defineProperty(window, 'innerHeight', { value: 264, configurable: true });
                    Object.defineProperty(window, 'outerWidth', { value: 464, configurable: true });
                    Object.defineProperty(window, 'outerHeight', { value: 264, configurable: true });
                    
                    console.log('Alternative resolution override applied for ${lobbyId}');
                } catch (e) {
                    console.error('Error applying alternative resolution override:', e);
                }
            })();
        `;

        try {
            webview.executeJavaScript(resolutionScript);
            console.log(`✅ Résolution alternative appliquée (464x264) sur ${lobbyId}`);
        } catch (error) {
            console.error(`❌ Erreur méthode alternative ${lobbyId}:`, error);
        }
    }

    setupLobbyInteractions(lobbyId) {
        const lobbyInstance = document.getElementById(`instance-${lobbyId}`);
        if (!lobbyInstance) return;

        const container = lobbyInstance.querySelector('.webview-container-16x9');
        const expandIcon = lobbyInstance.querySelector('.expand-icon');
        const testButton = lobbyInstance.querySelector(`#test-gamepad-${lobbyId}`);
        const autoPlayButton = lobbyInstance.querySelector(`#auto-play-${lobbyId}`);
        
        // Hover effects
        container.addEventListener('mouseenter', () => {
            expandIcon.style.display = 'flex';
        });
        
        container.addEventListener('mouseleave', () => {
            expandIcon.style.display = 'none';
        });
        
        // Expand functionality
        expandIcon.addEventListener('click', () => {
            this.expandWebview(lobbyId);
        });

        // Test gamepad functionality
        testButton.addEventListener('click', () => {
            this.testGamepadForLobby(lobbyId);
        });

        // Auto-play trigger
        autoPlayButton.addEventListener('click', () => {
            this.triggerAutoPlay(lobbyId);
        });
    }

    async triggerAutoPlay(lobbyId) {
        const autoPlayButton = document.getElementById(`auto-play-${lobbyId}`);
        const sessionStatus = document.getElementById(`session-status-${lobbyId}`);
        
        if (autoPlayButton) {
            autoPlayButton.style.background = 'rgba(255, 152, 0, 0.8)';
            autoPlayButton.style.borderColor = '#ff9800';
        }
        
        if (sessionStatus) {
            sessionStatus.textContent = '🎮 Auto-Playing...';
            sessionStatus.style.color = '#ff9800';
        }

        await this.sessionManager.triggerAutoPlay(lobbyId);
        
        setTimeout(() => {
            if (autoPlayButton) {
                autoPlayButton.style.background = 'rgba(76, 175, 80, 0.8)';
                autoPlayButton.style.borderColor = '#4CAF50';
            }
            
            if (sessionStatus) {
                sessionStatus.textContent = '🎮 Session Active';
                sessionStatus.style.color = '#4CAF50';
            }
        }, 3000);
    }

    expandWebview(lobbyId) {
        const webview = document.getElementById(`${lobbyId}-webview`);
        const overlay = document.createElement('div');
        
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const expandedContainer = document.createElement('div');
        expandedContainer.style.cssText = `
            width: 90vw;
            height: 90vh;
            background: white;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fermer';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            border: none;
            background: rgba(0,0,0,0.8);
            color: #ff4444;
            border-radius: 4px;
            cursor: pointer;
            z-index: 1001;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid #ff4444;
        `;
        
        const expandedWebview = document.createElement('webview');
        expandedWebview.src = webview.src;
        expandedWebview.partition = `persist:${lobbyId}`;
        expandedWebview.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        expandedContainer.appendChild(expandedWebview);
        expandedContainer.appendChild(closeButton);
        overlay.appendChild(expandedContainer);
        document.body.appendChild(overlay);
    }

    testGamepadForLobby(lobbyId) {
        window.uiManager.showNotification(`Test gamepad pour Lobby ${this.lobbies.indexOf(lobbyId) + 1}...`);
        this.gamepadInjector.testAllGamepadFeatures(lobbyId);
        
        const statusElement = document.getElementById(`session-status-${lobbyId}`);
        if (statusElement) {
            statusElement.textContent = '🎮 Testing...';
            statusElement.style.color = '#ff9800';
            
            setTimeout(() => {
                statusElement.textContent = '🎮 Session Active';
                statusElement.style.color = '#4CAF50';
            }, 8000);
        }
    }

    async connectControllerForLobby(lobbyId) {
        try {
            const result = await window.apiClient.connectController(lobbyId);
            
            if (result.success) {
                console.log(`Manette connectée pour ${lobbyId}`);
                
                // Start gamepad simulation
                setTimeout(() => {
                    this.startGamepadSimulation(lobbyId);
                }, 2000);
                
                return true;
            } else {
                console.error(`Erreur connexion manette pour ${lobbyId}:`, result.error);
                return false;
            }
        } catch (error) {
            console.error(`Erreur lors de la connexion de manette pour ${lobbyId}:`, error);
            return false;
        }
    }

    startGamepadSimulation(lobbyId) {
        const simulationInterval = setInterval(() => {
            const randomAction = Math.random();
            
            if (randomAction < 0.3) {
                this.gamepadInjector.simulateGamepadInput(lobbyId, 'stick_movement', {
                    leftStick: { 
                        x: (Math.random() - 0.5) * 2, 
                        y: (Math.random() - 0.5) * 2 
                    }
                });
            } else if (randomAction < 0.6) {
                const buttonIndex = Math.floor(Math.random() * 4);
                this.gamepadInjector.simulateGamepadInput(lobbyId, 'button_press', {
                    buttonIndex: buttonIndex,
                    duration: 100 + Math.random() * 200
                });
            }
        }, 2000 + Math.random() * 3000);

        // Store interval for cleanup
        if (!this.simulationIntervals) {
            this.simulationIntervals = new Map();
        }
        this.simulationIntervals.set(lobbyId, simulationInterval);
    }

    closeLobby(lobbyId) {
        // Destroy session
        this.sessionManager.destroySession(lobbyId);

        // Stop simulation
        if (this.simulationIntervals && this.simulationIntervals.has(lobbyId)) {
            clearInterval(this.simulationIntervals.get(lobbyId));
            this.simulationIntervals.delete(lobbyId);
        }

        // Remove from list
        const index = this.lobbies.indexOf(lobbyId);
        if (index > -1) {
            this.lobbies.splice(index, 1);
        }

        // Remove DOM element
        const lobbyInstance = document.getElementById(`instance-${lobbyId}`);
        if (lobbyInstance) {
            lobbyInstance.remove();
        }

        // Show "no lobbies" message if needed
        if (this.lobbies.length === 0) {
            const lobbyGrid = document.getElementById('lobby-grid');
            lobbyGrid.innerHTML = `
                <div class="no-lobbies">
                    <p>Aucun lobby ouvert</p>
                    <p>Utilisez le Lobby Manager pour ouvrir des lobbies</p>
                </div>
            `;
        }

        this.updateLobbyDisplay();
    }

    closeAllLobbies() {
        const lobbiesCount = this.lobbies.length;
        [...this.lobbies].forEach(lobbyId => {
            this.closeLobby(lobbyId);
        });
        return lobbiesCount;
    }

    refreshLobby(lobbyId) {
        const webview = document.getElementById(`${lobbyId}-webview`);
        if (webview) {
            // Destroy and recreate session
            this.sessionManager.destroySession(lobbyId);
            webview.reload();
            
            // Reinitialize session after reload
            setTimeout(() => {
                this.sessionManager.initializeWebviewSession(webview, lobbyId);
            }, 2000);
        }
    }

    refreshAllLobbies() {
        this.lobbies.forEach(lobbyId => {
            this.refreshLobby(lobbyId);
        });
        return this.lobbies.length;
    }

    updateLobbyDisplay() {
        const lobbyCountDisplay = document.getElementById('lobby-count-display');
        if (lobbyCountDisplay) {
            lobbyCountDisplay.textContent = this.lobbies.length;
        }

        const activeLobbyCount = document.getElementById('active-lobbies');
        if (activeLobbyCount) {
            activeLobbyCount.textContent = this.lobbies.length;
        }
    }

    getLobbies() {
        return this.lobbies;
    }

    getLobbyCount() {
        return this.lobbies.length;
    }
}

// Export for global access
window.LobbyManager = LobbyManager;
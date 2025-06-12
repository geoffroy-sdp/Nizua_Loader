// UI Manager Module - Handles UI updates, notifications, and tab management
class UIManager {
    constructor() {
        this.currentTab = 'main';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'error' ? '#ff4444' : '#44aa44'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    showConfirmationPopup(message, onConfirm, onCancel = null) {
        const popup = document.createElement('div');
        popup.className = 'confirmation-popup';
        popup.innerHTML = `
            <div class="popup-overlay">
                <div class="popup-content">
                    <h3>Confirmation</h3>
                    <p>${message}</p>
                    <div class="popup-buttons">
                        <button class="btn btn-danger" id="confirm-yes">Oui</button>
                        <button class="btn btn-secondary" id="confirm-no">Non</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const yesBtn = popup.querySelector('#confirm-yes');
        const noBtn = popup.querySelector('#confirm-no');
        
        yesBtn.addEventListener('click', () => {
            document.body.removeChild(popup);
            if (onConfirm) onConfirm();
        });
        
        noBtn.addEventListener('click', () => {
            document.body.removeChild(popup);
            if (onCancel) onCancel();
        });
        
        popup.querySelector('.popup-overlay').addEventListener('click', (e) => {
            if (e.target === popup.querySelector('.popup-overlay')) {
                document.body.removeChild(popup);
                if (onCancel) onCancel();
            }
        });
    }

    showSuccessPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'success-popup';
        popup.innerHTML = `
            <div class="popup-overlay">
                <div class="popup-content success">
                    <h3>✓ Succès</h3>
                    <p>${message}</p>
                    <button class="btn btn-success" id="success-ok">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('#success-ok').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 3000);
    }

    showErrorPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'error-popup';
        popup.innerHTML = `
            <div class="popup-overlay">
                <div class="popup-content error">
                    <h3>✗ Erreur</h3>
                    <p>${message}</p>
                    <button class="btn btn-danger" id="error-ok">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('#error-ok').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    }

    switchTab(tabId) {
        // Deactivate all tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Activate selected tab
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        const tabPane = document.getElementById(`${tabId}-tab`);
        
        if (tabButton && tabPane) {
            tabButton.classList.add('active');
            tabPane.classList.add('active');
            this.currentTab = tabId;
        }
    }

    updateServerStatus(status) {
        const serverStatusElement = document.getElementById('server-status');
        const connectionStatusElement = document.getElementById('connection-status');

        switch (status.status) {
            case 'running':
                serverStatusElement.textContent = `Serveur actif (Port: ${status.port})`;
                connectionStatusElement.textContent = '●';
                connectionStatusElement.style.color = '#00ff00';
                break;
            case 'error':
                serverStatusElement.textContent = `Erreur serveur: ${status.error}`;
                connectionStatusElement.textContent = '●';
                connectionStatusElement.style.color = '#ff0000';
                break;
            default:
                serverStatusElement.textContent = 'Statut serveur inconnu';
                connectionStatusElement.textContent = '●';
                connectionStatusElement.style.color = '#ffaa00';
        }
    }

    createLobbyTab() {
        const tabBar = document.getElementById('tab-bar');
        const existingLobbyTab = document.querySelector('[data-tab="lobby"]');
        
        if (!existingLobbyTab) {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button';
            tabButton.dataset.tab = 'lobby';
            tabButton.textContent = 'Lobby';
            tabBar.appendChild(tabButton);

            const tabContent = document.getElementById('tab-content');
            const tabPane = document.createElement('div');
            tabPane.id = 'lobby-tab';
            tabPane.className = 'tab-pane';
            tabPane.innerHTML = `
                <div class="lobby-container">
                    <div class="lobby-header">
                        <h2>Lobbies Actifs</h2>
                        <div class="lobby-info">
                            <span>Lobbies ouverts: <span id="lobby-count-display">0</span>/20</span>
                        </div>
                    </div>
                    <div id="lobby-grid" class="lobby-grid-16x9" style="text-align: left; padding: 20px;">
                        <div class="no-lobbies">
                            <p>Aucun lobby ouvert</p>
                            <p>Utilisez le Lobby Manager pour ouvrir des lobbies</p>
                        </div>
                    </div>
                </div>
            `;
            tabContent.appendChild(tabPane);
        }
    }

    updateLobbyList(lobbies) {
        const lobbyList = document.getElementById('lobby-list');
        if (!lobbyList) return;

        if (lobbies.length === 0) {
            lobbyList.innerHTML = '<p>Aucun lobby actif</p>';
        } else {
            lobbyList.innerHTML = lobbies.map((lobbyId, index) => {
                const lobbyNumber = index + 1;
                return `
                    <div class="lobby-item">
                        <span>Lobby ${lobbyNumber}</span>
                        <div class="lobby-item-controls">
                            <button onclick="window.uiManager.switchTab('lobby')" class="small-btn">Voir</button>
                            <button onclick="window.lobbyManager.refreshLobby('${lobbyId}')" class="small-btn">Actualiser</button>
                            <button onclick="window.lobbyManager.closeLobby('${lobbyId}')" class="small-btn danger">Fermer</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    getCurrentTab() {
        return this.currentTab;
    }
}

// Export for global access
window.UIManager = UIManager;
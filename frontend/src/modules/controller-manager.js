// Controller Manager Module - Handles controller operations and status
class ControllerManager {
    constructor() {
        this.controllerStatus = {
            controllers: {},
            global_movement_enabled: false,
            global_anti_afk_enabled: false
        };
    }

    async updateControllerStatus() {
        try {
            const status = await window.apiClient.getAllControllerStatus();
            
            // Update controller status
            Object.keys(status.controllers || {}).forEach(lobbyId => {
                if (this.controllerStatus.controllers[lobbyId]) {
                    this.controllerStatus.controllers[lobbyId] = {
                        ...this.controllerStatus.controllers[lobbyId],
                        ...status.controllers[lobbyId]
                    };
                }
            });
            
            this.updateButtonStates();
            return status;
        } catch (error) {
            console.error('Erreur lors de la récupération du statut:', error);
            return null;
        }
    }

    async toggleMovement() {
        const connectedControllers = this.getConnectedControllers();
        
        if (connectedControllers.length === 0) {
            throw new Error('Aucune manette connectée');
        }

        const movementBtn = document.getElementById('enable-movement-btn');
        movementBtn.disabled = true;

        try {
            const newMovementState = !this.controllerStatus.global_movement_enabled;

            const promises = connectedControllers.map(async (lobbyId) => {
                const controllerId = this.controllerStatus.controllers[lobbyId].controller_id;
                const response = await window.apiClient.toggleMovement(lobbyId, controllerId, newMovementState);
                return { lobbyId, response };
            });

            const results = await Promise.all(promises);
            let successCount = 0;

            results.forEach(({ lobbyId, response }) => {
                if (response.success) {
                    this.controllerStatus.controllers[lobbyId].movement_enabled = newMovementState;
                    successCount++;
                }
            });

            if (successCount > 0) {
                this.controllerStatus.global_movement_enabled = newMovementState;
            }

            this.updateButtonStates();
            return {
                success: true,
                message: `Mouvement ${newMovementState ? 'activé' : 'désactivé'} sur ${successCount}/${connectedControllers.length} manette(s)`,
                successCount,
                totalCount: connectedControllers.length
            };

        } finally {
            movementBtn.disabled = false;
        }
    }

    async toggleAntiAfk() {
        const connectedControllers = this.getConnectedControllers();
        
        if (connectedControllers.length === 0) {
            throw new Error('Aucune manette connectée');
        }

        const antiAfkBtn = document.getElementById('enable-anti-afk-btn');
        antiAfkBtn.disabled = true;

        try {
            const newAntiAfkState = !this.controllerStatus.global_anti_afk_enabled;

            const promises = connectedControllers.map(async (lobbyId) => {
                const controllerId = this.controllerStatus.controllers[lobbyId].controller_id;
                const response = await window.apiClient.toggleAntiAfk(lobbyId, controllerId, newAntiAfkState);
                return { lobbyId, response };
            });

            const results = await Promise.all(promises);
            let successCount = 0;

            results.forEach(({ lobbyId, response }) => {
                if (response.success) {
                    this.controllerStatus.controllers[lobbyId].anti_afk_enabled = newAntiAfkState;
                    successCount++;
                }
            });

            if (successCount > 0) {
                this.controllerStatus.global_anti_afk_enabled = newAntiAfkState;
            }

            this.updateButtonStates();
            return {
                success: true,
                message: `Anti-AFK ${newAntiAfkState ? 'activé' : 'désactivé'} sur ${successCount}/${connectedControllers.length} manette(s)`,
                successCount,
                totalCount: connectedControllers.length
            };

        } finally {
            antiAfkBtn.disabled = false;
        }
    }

    async selectClass() {
        const connectedControllers = this.getConnectedControllers();
        
        if (connectedControllers.length === 0) {
            throw new Error('Aucune manette connectée');
        }

        const selectBtn = document.getElementById('select-class-btn');
        selectBtn.disabled = true;
        selectBtn.textContent = 'Sélection...';

        try {
            const promises = connectedControllers.map(async (lobbyId) => {
                const controllerId = this.controllerStatus.controllers[lobbyId].controller_id;
                const response = await window.apiClient.selectClass(lobbyId, controllerId);
                return { lobbyId, response };
            });

            const results = await Promise.all(promises);
            let successCount = 0;
            
            results.forEach(({ lobbyId, response }) => {
                if (response.success) {
                    successCount++;
                }
            });

            return {
                success: true,
                message: `Classe sélectionnée sur ${successCount}/${connectedControllers.length} manette(s)`,
                successCount,
                totalCount: connectedControllers.length
            };

        } finally {
            selectBtn.disabled = false;
            selectBtn.textContent = 'Select Class';
        }
    }

    getConnectedControllers() {
        return Object.keys(this.controllerStatus.controllers).filter(
            lobbyId => this.controllerStatus.controllers[lobbyId] && 
                      this.controllerStatus.controllers[lobbyId].connected
        );
    }

    updateButtonStates() {
        const connectBtn = document.getElementById('connect-controller-btn');
        const movementBtn = document.getElementById('enable-movement-btn');
        const antiAfkBtn = document.getElementById('enable-anti-afk-btn');
        const selectBtn = document.getElementById('select-class-btn');

        const connectedCount = this.getConnectedControllers().length;
        const totalLobbies = window.lobbyManager ? window.lobbyManager.getLobbyCount() : 0;

        // Connect button (info only)
        if (connectedCount > 0) {
            connectBtn.textContent = `${connectedCount}/${totalLobbies} Manettes Connectées`;
            connectBtn.style.background = connectedCount === totalLobbies ? '#4CAF50' : '#ff9800';
            connectBtn.style.color = 'white';
            connectBtn.disabled = true;
        } else {
            connectBtn.textContent = 'Aucune Manette';
            connectBtn.style.background = '#ff4444';
            connectBtn.style.color = 'white';
            connectBtn.disabled = true;
        }

        // Movement button
        if (this.controllerStatus.global_movement_enabled) {
            movementBtn.textContent = 'Movement ON (All)';
            movementBtn.style.background = '#4CAF50';
        } else {
            movementBtn.textContent = 'Enable Movement (All)';
            movementBtn.style.background = '';
        }

        // Anti-AFK button
        if (this.controllerStatus.global_anti_afk_enabled) {
            antiAfkBtn.textContent = 'Anti-AFK ON (All)';
            antiAfkBtn.style.background = '#4CAF50';
        } else {
            antiAfkBtn.textContent = 'Enable Anti-AFK (All)';
            antiAfkBtn.style.background = '';
        }

        // Select class button
        selectBtn.textContent = `Select Class (All ${connectedCount})`;

        // Disable buttons if no controllers
        const needsController = [movementBtn, antiAfkBtn, selectBtn];
        needsController.forEach(btn => {
            btn.disabled = connectedCount === 0;
            btn.style.opacity = connectedCount === 0 ? '0.5' : '1';
        });
    }

    addController(lobbyId, controllerData) {
        this.controllerStatus.controllers[lobbyId] = {
            connected: true,
            movement_enabled: false,
            anti_afk_enabled: false,
            ...controllerData
        };
        this.updateButtonStates();
    }

    removeController(lobbyId) {
        delete this.controllerStatus.controllers[lobbyId];
        this.updateButtonStates();
    }

    getControllerStatus() {
        return this.controllerStatus;
    }
}

// Export for global access
window.ControllerManager = ControllerManager;
// API Client Module - Handles all server communication
class ApiClient {
    constructor(baseUrl = 'http://127.0.0.1:5000') {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Server status
    async getServerStatus() {
        return this.request('/api/status');
    }

    // Controller endpoints
    async connectController(lobbyId = null) {
        return this.request('/api/controller/connect', {
            method: 'POST',
            body: JSON.stringify({ lobby_id: lobbyId })
        });
    }

    async disconnectController(lobbyId = null, controllerId = null) {
        return this.request('/api/controller/disconnect', {
            method: 'POST',
            body: JSON.stringify({ lobby_id: lobbyId, controller_id: controllerId })
        });
    }

    async getControllerStatus() {
        return this.request('/api/controller/status');
    }

    async getAllControllerStatus() {
        return this.request('/api/controller/status-all');
    }

    async toggleMovement(lobbyId = null, controllerId = null, enabled = null) {
        return this.request('/api/controller/movement', {
            method: 'POST',
            body: JSON.stringify({ 
                lobby_id: lobbyId, 
                controller_id: controllerId,
                enabled: enabled 
            })
        });
    }

    async toggleAntiAfk(lobbyId = null, controllerId = null, enabled = null) {
        return this.request('/api/controller/anti-afk', {
            method: 'POST',
            body: JSON.stringify({ 
                lobby_id: lobbyId, 
                controller_id: controllerId,
                enabled: enabled 
            })
        });
    }

    async selectClass(lobbyId = null, controllerId = null) {
        return this.request('/api/controller/select-class', {
            method: 'POST',
            body: JSON.stringify({ lobby_id: lobbyId, controller_id: controllerId })
        });
    }

    // Settings endpoints
    async getGamepadConfig() {
        return this.request('/api/controller/config');
    }

    async saveGamepadConfig(config) {
        return this.request('/api/controller/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
    }

    async resetGamepadConfig() {
        return this.request('/api/controller/config/reset', {
            method: 'POST'
        });
    }

    async getDefaultGamepadConfig() {
        return this.request('/api/controller/config/default');
    }
}

// Export singleton instance
window.apiClient = new ApiClient();
// Simplified Settings Manager - Only essential functionality
class SettingsManager {
    constructor() {
        this.currentSettings = {};
        this.isDirty = false;
    }

    async loadSettings() {
        try {
            const data = await window.apiClient.getGamepadConfig();
            
            if (data.success) {
                this.currentSettings = data.config;
                this.updateUI();
                console.log('Configuration chargée:', this.currentSettings);
                return { success: true, data: this.currentSettings };
            } else {
                throw new Error(data.error || 'Erreur lors du chargement');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            window.uiManager.showNotification('Erreur lors du chargement des paramètres', 'error');
            return { success: false, error: error.message };
        }
    }

    async saveAllSettings() {
        try {
            const data = await window.apiClient.saveGamepadConfig(this.currentSettings);
            
            if (data.success) {
                this.isDirty = false;
                window.uiManager.showSuccessPopup('Configuration sauvegardée avec succès');
                console.log('Configuration sauvegardée');
                return { success: true };
            } else {
                throw new Error(data.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            window.uiManager.showErrorPopup('Erreur lors de la sauvegarde');
            return { success: false, error: error.message };
        }
    }

    async resetToDefault() {
        try {
            const data = await window.apiClient.resetGamepadConfig();
            
            if (data.success) {
                await this.loadSettings();
                window.uiManager.showSuccessPopup('Configuration réinitialisée');
                console.log('Configuration réinitialisée aux valeurs par défaut');
                return { success: true };
            } else {
                throw new Error(data.error || 'Erreur lors de la réinitialisation');
            }
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            window.uiManager.showErrorPopup('Erreur lors de la réinitialisation');
            return { success: false, error: error.message };
        }
    }

    updateParameterFromUI(section, key, value) {
        if (!this.currentSettings[section]) {
            this.currentSettings[section] = {};
        }
        
        this.currentSettings[section][key] = parseFloat(value);
        this.isDirty = true;
        
        this.updateSliderDisplay(key, value);
        console.log(`Paramètre UI mis à jour: ${section}.${key} = ${value}`);
    }

    updateSliderDisplay(sliderId, value) {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.value = value;

            const container = slider.closest('.slider-container');
            const valueDisplay = container ? container.querySelector('.slider-value') : null;

            if (valueDisplay) {
                if (sliderId.includes('interval') || sliderId.includes('duration')) {
                    valueDisplay.textContent = `${parseFloat(value).toFixed(2)}s`;
                } else {
                    valueDisplay.textContent = parseFloat(value).toFixed(2);
                }
            }
        }
    }

    updateUI() {
        Object.keys(this.currentSettings).forEach(section => {
            Object.keys(this.currentSettings[section]).forEach(key => {
                const value = this.currentSettings[section][key];
                const sliderId = key.replace(/_/g, '-');
                this.updateSliderDisplay(sliderId, value);
            });
        });
    }

    setupSliderEvents() {
        const sliders = document.querySelectorAll('#settings-panel .slider');
        
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const sliderId = e.target.id;
                const value = e.target.value;
            
                // Update UI display
                const container = e.target.closest('.slider-container');
                const valueDisplay = container ? container.querySelector('.slider-value') : null;
            
                if (valueDisplay) {
                    if (sliderId.includes('interval') || sliderId.includes('duration')) {
                        valueDisplay.textContent = `${parseFloat(value).toFixed(2)}s`;
                    } else {
                        valueDisplay.textContent = parseFloat(value).toFixed(2);
                    }
                }
            
                // Determine section
                let section = 'Movement';
                if (sliderId.includes('antiafk') || sliderId.includes('bumper') || sliderId.includes('delay-between')) {
                    section = 'AntiAFK';
                }
            
                const key = sliderId.replace(/-/g, '_');
                this.updateParameterFromUI(section, key, value);
            });
        });
    }

    setupButtons() {
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                window.uiManager.showConfirmationPopup(
                    'Êtes-vous sûr de vouloir sauvegarder tous les paramètres ?',
                    () => this.saveAllSettings()
                );
            });
        }
        
        const resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                window.uiManager.showConfirmationPopup(
                    'Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ? Cette action est irréversible.',
                    () => this.resetToDefault()
                );
            });
        }
    }

    hasUnsavedChanges() {
        return this.isDirty;
    }

    getCurrentSettings() {
        return this.currentSettings;
    }
}

// Export for global access
window.SettingsManager = SettingsManager;
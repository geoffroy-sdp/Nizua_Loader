// gamepad_injector.js - Injecter des événements gamepad virtuels dans les webviews

class GamepadInjector {
    constructor() {
        this.virtualGamepads = new Map();
        this.isInjecting = false;
    }

    // Créer un gamepad virtuel pour une webview
    createVirtualGamepad(webviewId, gamepadIndex = 0) {
        const virtualGamepad = {
            id: `Virtual Controller (${webviewId})`,
            index: gamepadIndex,
            connected: true,
            mapping: 'standard',
            buttons: Array(17).fill().map(() => ({ pressed: false, touched: false, value: 0.0 })),
            axes: [0.0, 0.0, 0.0, 0.0], // Left stick X, Y, Right stick X, Y
            timestamp: performance.now(),
            vibrationActuator: null
        };

        this.virtualGamepads.set(webviewId, virtualGamepad);
        return virtualGamepad;
    }

    // Injecter le script dans une webview pour simuler les gamepads
    injectGamepadAPI(webview, webviewId) {
        if (!webview) return;

        const injectionScript = `
            (function() {
                // Stocker l'API originale
                const originalGetGamepads = navigator.getGamepads.bind(navigator);
                
                // Gamepad virtuel
                let virtualGamepad = null;
                
                // Créer le gamepad virtuel
                function createVirtualGamepad() {
                    return {
                        id: 'Virtual Xbox Controller (${webviewId})',
                        index: 0,
                        connected: true,
                        mapping: 'standard',
                        buttons: Array(17).fill().map(() => ({ 
                            pressed: false, 
                            touched: false, 
                            value: 0.0 
                        })),
                        axes: [0.0, 0.0, 0.0, 0.0],
                        timestamp: performance.now(),
                        vibrationActuator: null
                    };
                }
                
                // Initialiser le gamepad virtuel
                virtualGamepad = createVirtualGamepad();
                
                // Remplacer navigator.getGamepads
                navigator.getGamepads = function() {
                    const gamepads = Array(4).fill(null);
                    gamepads[0] = virtualGamepad;
                    return gamepads;
                };
                
                // Fonction pour mettre à jour le gamepad
                window.updateVirtualGamepad = function(updates) {
                    if (!virtualGamepad) return;
                    
                    if (updates.buttons) {
                        updates.buttons.forEach((button, index) => {
                            if (virtualGamepad.buttons[index]) {
                                virtualGamepad.buttons[index].pressed = button.pressed || false;
                                virtualGamepad.buttons[index].value = button.value || 0.0;
                            }
                        });
                    }
                    
                    if (updates.axes) {
                        updates.axes.forEach((value, index) => {
                            if (index < virtualGamepad.axes.length) {
                                virtualGamepad.axes[index] = value;
                            }
                        });
                    }
                    
                    virtualGamepad.timestamp = performance.now();
                    
                    // Déclencher les événements gamepad
                    if (updates.connected !== undefined) {
                        const event = new CustomEvent(updates.connected ? 'gamepadconnected' : 'gamepaddisconnected', {
                            detail: { gamepad: virtualGamepad }
                        });
                        window.dispatchEvent(event);
                    }
                };
                
                // Simuler la connexion du gamepad au chargement
                setTimeout(() => {
                    const connectEvent = new CustomEvent('gamepadconnected', {
                        detail: { gamepad: virtualGamepad }
                    });
                    window.dispatchEvent(connectEvent);
                    
                    console.log('Virtual gamepad connected:', virtualGamepad);
                }, 1000);
                
                // Simulation d'activité gamepad périodique
                setInterval(() => {
                    if (virtualGamepad && virtualGamepad.connected) {
                        // Simulation légère de mouvement pour maintenir la détection
                        const randomMovement = (Math.random() - 0.5) * 0.1;
                        virtualGamepad.axes[0] = randomMovement;
                        virtualGamepad.axes[1] = randomMovement;
                        virtualGamepad.timestamp = performance.now();
                    }
                }, 1000);
            })();
        `;

        // Injecter le script après que la webview soit chargée
        webview.addEventListener('dom-ready', () => {
            try {
                webview.executeJavaScript(injectionScript);
                console.log(`Gamepad API injectée dans webview ${webviewId}`);
            } catch (error) {
                console.error(`Erreur injection gamepad dans ${webviewId}:`, error);
            }
        });
    }

    // Simuler des inputs de gamepad dans une webview
    simulateGamepadInput(webviewId, inputType, data) {
        const webview = document.getElementById(`${webviewId}-webview`);
        if (!webview) return;

        let updateScript = '';

        switch (inputType) {
            case 'button_press':
                updateScript = `
                    if (window.updateVirtualGamepad) {
                        const buttons = Array(17).fill().map(() => ({ pressed: false, value: 0.0 }));
                        buttons[${data.buttonIndex}] = { pressed: true, value: 1.0 };
                        window.updateVirtualGamepad({ buttons: buttons });
                        
                        setTimeout(() => {
                            buttons[${data.buttonIndex}] = { pressed: false, value: 0.0 };
                            window.updateVirtualGamepad({ buttons: buttons });
                        }, ${data.duration || 100});
                    }
                `;
                break;

            case 'stick_movement':
                updateScript = `
                    if (window.updateVirtualGamepad) {
                        const axes = [0.0, 0.0, 0.0, 0.0];
                        ${data.leftStick ? `axes[0] = ${data.leftStick.x}; axes[1] = ${data.leftStick.y};` : ''}
                        ${data.rightStick ? `axes[2] = ${data.rightStick.x}; axes[3] = ${data.rightStick.y};` : ''}
                        window.updateVirtualGamepad({ axes: axes });
                    }
                `;
                break;

            case 'continuous_movement':
                // Mouvement continu avec variation
                const movements = [
                    { x: 0.5, y: 0.0 },   // Droite
                    { x: 0.0, y: 0.5 },   // Bas
                    { x: -0.5, y: 0.0 },  // Gauche
                    { x: 0.0, y: -0.5 },  // Haut
                    { x: 0.0, y: 0.0 }    // Centre
                ];
                
                let currentMovement = 0;
                const movementInterval = setInterval(() => {
                    const movement = movements[currentMovement % movements.length];
                    updateScript = `
                        if (window.updateVirtualGamepad) {
                            window.updateVirtualGamepad({ 
                                axes: [${movement.x}, ${movement.y}, 0.0, 0.0] 
                            });
                        }
                    `;
                    
                    try {
                        webview.executeJavaScript(updateScript);
                    } catch (error) {
                        console.error('Erreur simulation mouvement:', error);
                        clearInterval(movementInterval);
                    }
                    
                    currentMovement++;
                    if (currentMovement >= movements.length * 3) { // 3 cycles
                        clearInterval(movementInterval);
                    }
                }, 500);
                return;
        }

        try {
            webview.executeJavaScript(updateScript);
        } catch (error) {
            console.error(`Erreur simulation input ${inputType}:`, error);
        }
    }

    // Test de toutes les fonctionnalités gamepad pour une webview
    testAllGamepadFeatures(webviewId) {
        console.log(`Test complet gamepad pour ${webviewId}`);
        
        // Test 1: Boutons principaux
        setTimeout(() => this.simulateGamepadInput(webviewId, 'button_press', { buttonIndex: 0, duration: 200 }), 1000); // A
        setTimeout(() => this.simulateGamepadInput(webviewId, 'button_press', { buttonIndex: 1, duration: 200 }), 1500); // B
        setTimeout(() => this.simulateGamepadInput(webviewId, 'button_press', { buttonIndex: 2, duration: 200 }), 2000); // X
        setTimeout(() => this.simulateGamepadInput(webviewId, 'button_press', { buttonIndex: 3, duration: 200 }), 2500); // Y
        
        // Test 2: Sticks analogiques
        setTimeout(() => {
            this.simulateGamepadInput(webviewId, 'stick_movement', {
                leftStick: { x: 1.0, y: 0.0 },
                rightStick: { x: 0.0, y: 1.0 }
            });
        }, 3000);
        
        // Test 3: Mouvement continu
        setTimeout(() => {
            this.simulateGamepadInput(webviewId, 'continuous_movement', {});
        }, 4000);
    }
}

// Export pour utilisation dans renderer.js
window.GamepadInjector = GamepadInjector;
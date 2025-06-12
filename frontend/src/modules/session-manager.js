// Session Manager Module - Handles Xbox Cloud Gaming session isolation and auto-play
class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.autoPlayEnabled = true;
        this.sessionTimeouts = new Map();
    }

    createSession(lobbyId) {
        const session = {
            id: lobbyId,
            status: 'initializing',
            lastActivity: Date.now(),
            autoPlayActive: false,
            clickAttempts: 0,
            maxClickAttempts: 5
        };
        
        this.sessions.set(lobbyId, session);
        return session;
    }

    async initializeWebviewSession(webview, lobbyId) {
        const session = this.createSession(lobbyId);
        
        // Setup session isolation
        await this.setupSessionIsolation(webview, lobbyId);
        
        // Setup auto-play detection and handling
        this.setupAutoPlayHandling(webview, lobbyId);
        
        // Setup session monitoring
        this.startSessionMonitoring(lobbyId);
        
        console.log(`Session initialized for ${lobbyId}`);
        return session;
    }

    async setupSessionIsolation(webview, lobbyId) {
        // Inject session isolation script
        const isolationScript = `
            (function() {
                // Override localStorage to be session-specific
                const originalLocalStorage = window.localStorage;
                const sessionKey = '${lobbyId}';
                
                // Create isolated storage
                const isolatedStorage = {
                    data: {},
                    getItem: function(key) {
                        return this.data[sessionKey + '_' + key] || null;
                    },
                    setItem: function(key, value) {
                        this.data[sessionKey + '_' + key] = value;
                        // Also set in original storage with session prefix
                        originalLocalStorage.setItem(sessionKey + '_' + key, value);
                    },
                    removeItem: function(key) {
                        delete this.data[sessionKey + '_' + key];
                        originalLocalStorage.removeItem(sessionKey + '_' + key);
                    },
                    clear: function() {
                        // Only clear session-specific items
                        Object.keys(this.data).forEach(key => {
                            if (key.startsWith(sessionKey + '_')) {
                                delete this.data[key];
                                originalLocalStorage.removeItem(key);
                            }
                        });
                    }
                };
                
                // Replace localStorage
                Object.defineProperty(window, 'localStorage', {
                    value: isolatedStorage,
                    writable: false
                });
                
                // Override sessionStorage similarly
                const originalSessionStorage = window.sessionStorage;
                const isolatedSessionStorage = {
                    data: {},
                    getItem: function(key) {
                        return this.data[sessionKey + '_' + key] || null;
                    },
                    setItem: function(key, value) {
                        this.data[sessionKey + '_' + key] = value;
                    },
                    removeItem: function(key) {
                        delete this.data[sessionKey + '_' + key];
                    },
                    clear: function() {
                        this.data = {};
                    }
                };
                
                Object.defineProperty(window, 'sessionStorage', {
                    value: isolatedSessionStorage,
                    writable: false
                });
                
                console.log('Session isolation setup complete for ${lobbyId}');
            })();
        `;

        webview.addEventListener('dom-ready', () => {
            try {
                webview.executeJavaScript(isolationScript);
            } catch (error) {
                console.error(`Error setting up session isolation for ${lobbyId}:`, error);
            }
        });
    }

    setupAutoPlayHandling(webview, lobbyId) {
        const autoPlayScript = `
            (function() {
                let autoPlayActive = false;
                let clickAttempts = 0;
                const maxAttempts = 10;
                
                // Function to find and click play button
                function findAndClickPlayButton() {
                    if (clickAttempts >= maxAttempts) {
                        console.log('Max click attempts reached for ${lobbyId}');
                        return false;
                    }
                    
                    // Multiple selectors for Xbox Cloud Gaming play buttons
                    const selectors = [
                        'button[data-testid="play-button"]',
                        'button[aria-label*="Play"]',
                        'button[aria-label*="play"]',
                        'button:contains("Play")',
                        'button:contains("PLAY")',
                        '.play-button',
                        '[data-automation-id="play-button"]',
                        'button[class*="play"]',
                        'div[role="button"][aria-label*="Play"]',
                        'div[role="button"][aria-label*="play"]'
                    ];
                    
                    for (const selector of selectors) {
                        try {
                            let elements;
                            if (selector.includes(':contains')) {
                                const text = selector.match(/contains\\("(.+?)"\\)/)[1];
                                elements = Array.from(document.querySelectorAll('button')).filter(
                                    el => el.textContent.trim().toLowerCase().includes(text.toLowerCase())
                                );
                            } else {
                                elements = document.querySelectorAll(selector);
                            }
                            
                            for (const element of elements) {
                                if (element && element.offsetParent !== null && !element.disabled) {
                                    console.log('Found play button for ${lobbyId}:', element);
                                    
                                    // Simulate human-like click
                                    const rect = element.getBoundingClientRect();
                                    const x = rect.left + rect.width / 2;
                                    const y = rect.top + rect.height / 2;
                                    
                                    // Create and dispatch mouse events
                                    const mouseDown = new MouseEvent('mousedown', {
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y
                                    });
                                    
                                    const mouseUp = new MouseEvent('mouseup', {
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y
                                    });
                                    
                                    const click = new MouseEvent('click', {
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y
                                    });
                                    
                                    element.dispatchEvent(mouseDown);
                                    setTimeout(() => {
                                        element.dispatchEvent(mouseUp);
                                        element.dispatchEvent(click);
                                    }, 50);
                                    
                                    // Also try direct click
                                    setTimeout(() => {
                                        element.click();
                                    }, 100);
                                    
                                    clickAttempts++;
                                    console.log('Clicked play button for ${lobbyId}, attempt:', clickAttempts);
                                    return true;
                                }
                            }
                        } catch (e) {
                            console.log('Selector failed:', selector, e);
                        }
                    }
                    
                    return false;
                }
                
                // Function to check if we need to click play
                function checkForPlayButton() {
                    // Look for text indicators that we need to click play
                    const playIndicators = [
                        'click here to play',
                        'click to play',
                        'tap to play',
                        'press to play',
                        'start playing',
                        'launch game'
                    ];
                    
                    const bodyText = document.body.textContent.toLowerCase();
                    const needsPlay = playIndicators.some(indicator => 
                        bodyText.includes(indicator)
                    );
                    
                    if (needsPlay && !autoPlayActive) {
                        console.log('Play button needed for ${lobbyId}');
                        autoPlayActive = true;
                        
                        // Try to click immediately
                        if (findAndClickPlayButton()) {
                            // Set up periodic retry in case first click didn't work
                            const retryInterval = setInterval(() => {
                                if (clickAttempts < maxAttempts) {
                                    const bodyTextNow = document.body.textContent.toLowerCase();
                                    const stillNeedsPlay = playIndicators.some(indicator => 
                                        bodyTextNow.includes(indicator)
                                    );
                                    
                                    if (stillNeedsPlay) {
                                        findAndClickPlayButton();
                                    } else {
                                        console.log('Play button no longer needed for ${lobbyId}');
                                        autoPlayActive = false;
                                        clearInterval(retryInterval);
                                    }
                                } else {
                                    clearInterval(retryInterval);
                                }
                            }, 2000);
                            
                            // Clear retry after 30 seconds
                            setTimeout(() => {
                                clearInterval(retryInterval);
                                autoPlayActive = false;
                            }, 30000);
                        }
                    }
                }
                
                // Monitor for changes
                const observer = new MutationObserver(() => {
                    checkForPlayButton();
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                
                // Initial check
                setTimeout(checkForPlayButton, 2000);
                
                // Periodic check
                setInterval(checkForPlayButton, 5000);
                
                // Expose function for manual triggering
                window.triggerAutoPlay = findAndClickPlayButton;
                
                console.log('Auto-play handler setup complete for ${lobbyId}');
            })();
        `;

        webview.addEventListener('did-finish-load', () => {
            setTimeout(() => {
                try {
                    webview.executeJavaScript(autoPlayScript);
                } catch (error) {
                    console.error(`Error setting up auto-play for ${lobbyId}:`, error);
                }
            }, 1000);
        });
    }

    startSessionMonitoring(lobbyId) {
        const monitorInterval = setInterval(() => {
            const session = this.sessions.get(lobbyId);
            if (!session) {
                clearInterval(monitorInterval);
                return;
            }

            // Update last activity
            session.lastActivity = Date.now();

            // Check if webview still exists
            const webview = document.getElementById(`${lobbyId}-webview`);
            if (!webview) {
                this.destroySession(lobbyId);
                clearInterval(monitorInterval);
                return;
            }

            // Trigger periodic auto-play check
            try {
                webview.executeJavaScript(`
                    if (window.triggerAutoPlay) {
                        // Check if we need to trigger auto-play
                        const bodyText = document.body.textContent.toLowerCase();
                        const playIndicators = [
                            'click here to play',
                            'click to play',
                            'tap to play'
                        ];
                        
                        if (playIndicators.some(indicator => bodyText.includes(indicator))) {
                            console.log('Triggering auto-play for ${lobbyId}');
                            window.triggerAutoPlay();
                        }
                    }
                `);
            } catch (error) {
                console.error(`Error in session monitoring for ${lobbyId}:`, error);
            }
        }, 10000); // Check every 10 seconds

        this.sessionTimeouts.set(lobbyId, monitorInterval);
    }

    destroySession(lobbyId) {
        const session = this.sessions.get(lobbyId);
        if (session) {
            console.log(`Destroying session for ${lobbyId}`);
            this.sessions.delete(lobbyId);
        }

        const timeout = this.sessionTimeouts.get(lobbyId);
        if (timeout) {
            clearInterval(timeout);
            this.sessionTimeouts.delete(lobbyId);
        }
    }

    getSession(lobbyId) {
        return this.sessions.get(lobbyId);
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    // Manual trigger for auto-play
    async triggerAutoPlay(lobbyId) {
        const webview = document.getElementById(`${lobbyId}-webview`);
        if (webview) {
            try {
                await webview.executeJavaScript(`
                    if (window.triggerAutoPlay) {
                        window.triggerAutoPlay();
                    }
                `);
                console.log(`Manual auto-play triggered for ${lobbyId}`);
            } catch (error) {
                console.error(`Error triggering auto-play for ${lobbyId}:`, error);
            }
        }
    }
}

// Export for global access
window.SessionManager = SessionManager;
// Interface compatible avec renderer.js - Pas de logique JS personnalisée
        // Le renderer.js gère toute la logique de l'application
        
        // Animation de chargement pour le statut du serveur seulement
        function animateServerStatus() {
            const statusElement = document.getElementById('server-status');
            if (statusElement && statusElement.textContent === 'Vérification du serveur...') {
                const messages = [
                    'Vérification du serveur...',
                    'Connexion en cours...',
                    'Prêt pour connexion'
                ];
                let index = 0;
                
                const interval = setInterval(() => {
                    if (statusElement.textContent === messages[0] || statusElement.textContent === messages[1]) {
                        statusElement.textContent = messages[index];
                        index++;
                        if (index >= messages.length) {
                            clearInterval(interval);
                        }
                    } else {
                        clearInterval(interval);
                    }
                }, 1500);
            }
        }

        // Initialisation minimale - renderer.js prend le relais
        document.addEventListener('DOMContentLoaded', () => {
            animateServerStatus();
        });
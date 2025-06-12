#!/usr/bin/env python3
"""
Nizua Loader - Serveur Backend Python
Serveur Flask pour gérer les fonctionnalités backend du loader avec support gamepad
Version corrigée sans système de shortcuts - utilise uniquement les webviews d'Electron
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import time
import json
import os
import sys
import configparser

# Import des classes du projet original
try:
    from gamepad_control import GamepadController
except ImportError:
    print("Attention: gamepad_control.py non trouvé. Fonctionnalités gamepad désactivées.")
    GamepadController = None

app = Flask(__name__)
CORS(app)

class NizuaServer:
    def __init__(self):
        self.status = "running"
        self.games = []
        self.settings = {}
        self.controller = None
        self.bo6_url = "https://www.xbox.com/en-US/play/launch/call-of-duty-black-ops-6---cross-gen-bundle/9PF528M6CRHQ"
        self.xbox_play_url = "https://xbox.com/play"
        
        self.load_config()

    def load_config(self):
        """Charger la configuration depuis un fichier JSON et INI"""
        # Configuration JSON existante
        config_path = "nizua_config.json"
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.games = config.get('games', [])
                    self.settings = config.get('settings', {})
                print(f"Configuration JSON chargée: {len(self.games)} jeux trouvés")
            except Exception as e:
                print(f"Erreur lors du chargement de la configuration JSON: {e}")
        else:
            self.create_default_config()

        # Configuration INI pour les paramètres gamepad
        self.config = configparser.ConfigParser()
        self.config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini")
        
        # Créer le fichier de config par défaut s'il n'existe pas
        if not os.path.exists(self.config_path):
            self.create_default_gamepad_config()
        
        self.config.read(self.config_path)

    def create_default_config(self):
        """Créer une configuration par défaut"""
        default_config = {
            "games": [
                {
                    "id": 1,
                    "name": "Call of Duty: Black Ops 6",
                    "path": self.bo6_url,
                    "installed": True
                }
            ],
            "settings": {
                "auto_start": False,
                "check_updates": True,
                "theme": "dark"
            }
        }
        
        try:
            with open("nizua_config.json", 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            print("Configuration par défaut créée")
        except Exception as e:
            print(f"Erreur lors de la création de la configuration: {e}")

    def create_default_gamepad_config(self):
        """Créer une configuration gamepad par défaut (version mise à jour)"""
        default_config = self.get_default_gamepad_config()
        
        config = configparser.ConfigParser()
        
        for section_name, section_data in default_config.items():
            config[section_name] = section_data
        
        try:
            with open(self.config_path, 'w') as configfile:
                config.write(configfile)
            print("Configuration gamepad par défaut créée")
        except Exception as e:
            print(f"Erreur lors de la création de la configuration gamepad: {e}")
    
    def get_default_gamepad_config(self):
        """Obtenir la configuration gamepad par défaut"""
        return {
            'Movement': {
                'look_intensity': '3.0',
                'move_intensity': '2.0',
                'forward_intensity': '2.0',
                'ads_chance': '0.040000000000000036',
                'jump_chance': '1.0',
                'jump_interval': '1.0',
                'weapon_switch_chance': '1.0',
                'weapon_switch_interval': '15.0',
                'strafe_chance': '0.25',
                'forward_bias': '0.4',
                'shoot_chance': '0.09999999999999998',
                'shoot_duration': '0.29799999999999993',
                'crouch_chance': '0.3',
                'x_button_chance': '0.3',
                'x_button_interval': '5.0',
                'min_movement_duration': '9.377633711507293',
                'max_movement_duration': '14.817396002160994',
                'min_break_duration': '1.0',
                'max_break_duration': '3.1766612641815235'
            },
            'AntiAFK': {
                'interval': '60.599999999999994',
                'right_bumper_duration': '0.1359999999999999',
                'left_bumper_duration': '0.1417857142857143',
                'delay_between_buttons': '1.012'
            }
        }
        
    def save_gamepad_config(self, config_data):
        """Sauvegarder la configuration gamepad complète"""
        try:
            # Créer un nouveau parser
            new_config = configparser.ConfigParser()

            # Ajouter les sections et paramètres
            for section_name, section_data in config_data.items():
                new_config.add_section(section_name)
                for key, value in section_data.items():
                    new_config.set(section_name, key, str(value))

            # Sauvegarder dans le fichier
            with open(self.config_path, 'w') as configfile:
                new_config.write(configfile)

            # Recharger la config en mémoire
            self.config = new_config

            # Mettre à jour le contrôleur si connecté
            if self.controller:
                self.controller.reload_config()

            return {"success": True, "message": "Configuration sauvegardée avec succès"}
        except Exception as e:
            return {"error": f"Erreur lors de la sauvegarde: {str(e)}"}
    
    def reset_gamepad_config_to_default(self):
        """Réinitialiser la configuration gamepad aux valeurs par défaut"""
        try:
            default_config = self.get_default_gamepad_config()
            result = self.save_gamepad_config(default_config)

            if result.get('success'):
                return {"success": True, "message": "Configuration réinitialisée aux valeurs par défaut"}
            else:
                return result
        except Exception as e:
                return {"error": f"Erreur lors de la réinitialisation: {str(e)}"}
    
    def add_gamepad_parameter(self, section, key, value):
        """Ajouter un nouveau paramètre à la configuration gamepad"""
        try:
            if section not in self.config:
                self.config.add_section(section)
            
            # Vérifier si le paramètre existe déjà
            if self.config.has_option(section, key):
                return {"error": f"Le paramètre {section}.{key} existe déjà. Utilisez update pour le modifier."}
            
            self.config.set(section, key, str(value))
            
            # Sauvegarder dans le fichier
            with open(self.config_path, 'w') as configfile:
                self.config.write(configfile)
            
            # Mettre à jour le contrôleur si connecté
            if self.controller:
                self.controller.update_config(section, key, value)
            
            return {"success": True, "message": f"Paramètre {section}.{key} ajouté avec succès"}
        except Exception as e:
            return {"error": f"Erreur lors de l'ajout du paramètre: {str(e)}"}
    
    def modify_gamepad_parameter(self, section, key, value):
        """Modifier un paramètre existant de la configuration gamepad"""
        try:
            if section not in self.config:
                return {"error": f"Section {section} non trouvée"}
            
            if not self.config.has_option(section, key):
                return {"error": f"Paramètre {section}.{key} non trouvé"}
            
            old_value = self.config.get(section, key)
            self.config.set(section, key, str(value))
            
            # Sauvegarder dans le fichier
            with open(self.config_path, 'w') as configfile:
                self.config.write(configfile)
            
            # Mettre à jour le contrôleur si connecté
            if self.controller:
                self.controller.update_config(section, key, value)
            
            return {
                "success": True, 
                "message": f"Paramètre {section}.{key} modifié avec succès",
                "old_value": old_value,
                "new_value": str(value)
            }
        except Exception as e:
            return {"error": f"Erreur lors de la modification du paramètre: {str(e)}"}
    
    def delete_gamepad_parameter(self, section, key):
        """Supprimer un paramètre de la configuration gamepad"""
        try:
            if section not in self.config:
                return {"error": f"Section {section} non trouvée"}
            
            if not self.config.has_option(section, key):
                return {"error": f"Paramètre {section}.{key} non trouvé"}
            
            old_value = self.config.get(section, key)
            self.config.remove_option(section, key)
            
            # Supprimer la section si elle est vide
            if len(self.config.options(section)) == 0:
                self.config.remove_section(section)
            
            # Sauvegarder dans le fichier
            with open(self.config_path, 'w') as configfile:
                self.config.write(configfile)
            
            return {
                "success": True, 
                "message": f"Paramètre {section}.{key} supprimé avec succès",
                "deleted_value": old_value
            }
        except Exception as e:
            return {"error": f"Erreur lors de la suppression du paramètre: {str(e)}"}
    
    def get_gamepad_config_formatted(self):
        """Obtenir la configuration gamepad dans un format structuré"""
        try:
            config_dict = {}
            for section_name in self.config.sections():
                config_dict[section_name] = {}
                for key, value in self.config.items(section_name):
                    # Essayer de convertir en nombre si possible
                    try:
                        if '.' in value:
                            config_dict[section_name][key] = float(value)
                        else:
                            config_dict[section_name][key] = int(value)
                    except ValueError:
                        config_dict[section_name][key] = value
            
            return {"success": True, "config": config_dict}
        except Exception as e:
            return {"error": f"Erreur lors de la lecture de la configuration: {str(e)}"}
    
    def get_xbox_urls(self):
        """Retourner les URLs Xbox pour les webviews"""
        return {
            "xbox_play": self.xbox_play_url,
            "bo6_launch": self.bo6_url
        }

    def connect_controller(self):
        """Connecter la manette"""
        if GamepadController is None:
            return {"error": "Module gamepad non disponible"}
        
        try:
            if not self.controller:
                self.controller = GamepadController()
            
            if self.controller.gamepad is None:
                if self.controller.connect():
                    self.controller.start()
                    return {"success": True, "message": "Manette connectée"}
                else:
                    return {"error": "Échec de connexion de la manette"}
            else:
                return {"success": True, "message": "Manette déjà connectée"}
        except Exception as e:
            return {"error": str(e)}

    def disconnect_controller(self):
        """Déconnecter la manette"""
        try:
            if self.controller:
                self.controller.disconnect()
                self.controller = None
                return {"success": True, "message": "Manette déconnectée"}
            return {"error": "Aucune manette connectée"}
        except Exception as e:
            return {"error": str(e)}

    def toggle_movement(self):
        """Activer/désactiver le mouvement automatique"""
        if not self.controller:
            return {"error": "Manette non connectée"}
        
        try:
            is_enabled = self.controller.toggle_movement()
            status = "activé" if is_enabled else "désactivé"
            return {"success": True, "message": f"Mouvement {status}", "enabled": is_enabled}
        except Exception as e:
            return {"error": str(e)}

    def toggle_anti_afk(self):
        """Activer/désactiver l'anti-AFK"""
        if not self.controller:
            return {"error": "Manette non connectée"}
        
        try:
            is_enabled = self.controller.toggle_anti_afk()
            status = "activé" if is_enabled else "désactivé"
            return {"success": True, "message": f"Anti-AFK {status}", "enabled": is_enabled}
        except Exception as e:
            return {"error": str(e)}

    def select_class(self):
        """Sélectionner une classe"""
        if not self.controller:
            return {"error": "Manette non connectée"}
        
        try:
            if self.controller.select_class():
                return {"success": True, "message": "Classe sélectionnée"}
            else:
                return {"error": "Échec de sélection de classe"}
        except Exception as e:
            return {"error": str(e)}

    def get_controller_status(self):
        """Obtenir le statut de la manette"""
        if not self.controller:
            return {"connected": False, "movement_enabled": False, "anti_afk_enabled": False}
        
        return {
            "connected": self.controller.gamepad is not None,
            "movement_enabled": getattr(self.controller, 'movement_enabled', False),
            "anti_afk_enabled": getattr(self.controller, 'anti_afk_enabled', False)
        }

    def update_gamepad_setting(self, section, key, value):
        """Mettre à jour un paramètre de la manette"""
        try:
            if section not in self.config:
                self.config.add_section(section)
            
            self.config.set(section, key, str(value))
            
            # Sauvegarder dans le fichier
            with open(self.config_path, 'w') as configfile:
                self.config.write(configfile)
            
            # Mettre à jour le contrôleur si connecté
            if self.controller:
                self.controller.update_config(section, key, value)
            
            return {"success": True, "message": f"Paramètre {section}.{key} mis à jour"}
        except Exception as e:
            return {"error": str(e)}

    def get_gamepad_settings(self):
        """Obtenir tous les paramètres de la manette"""
        try:
            settings = {}
            for section in self.config.sections():
                settings[section] = dict(self.config.items(section))
            return {"success": True, "settings": settings}
        except Exception as e:
            return {"error": str(e)}

nizua_server = NizuaServer()

# Routes API pour le statut
@app.route('/api/status', methods=['GET'])
def get_status():
    """Obtenir le statut du serveur"""
    return jsonify({
        'status': nizua_server.status,
        'timestamp': time.time(),
        'games_count': len(nizua_server.games)
    })

@app.route('/api/games', methods=['GET'])
def get_games():
    """Obtenir la liste des jeux"""
    return jsonify({
        'games': nizua_server.games,
        'count': len(nizua_server.games)
    })

# Routes pour les URLs Xbox (pour les webviews)
@app.route('/api/xbox/urls', methods=['GET'])
def get_xbox_urls():
    """Obtenir les URLs Xbox pour les webviews"""
    return jsonify(nizua_server.get_xbox_urls())

# Routes pour les fonctionnalités gamepad
@app.route('/api/controller/connect', methods=['POST'])
def connect_controller():
    """Connecter la manette"""
    result = nizua_server.connect_controller()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/disconnect', methods=['POST'])
def disconnect_controller():
    """Déconnecter la manette"""
    result = nizua_server.disconnect_controller()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/status', methods=['GET'])
def get_controller_status():
    """Obtenir le statut de la manette"""
    return jsonify(nizua_server.get_controller_status())

@app.route('/api/controller/status-all', methods=['GET'])
def get_all_controller_status():
    """Obtenir le statut de toutes les manettes (format multi-lobby)"""
    controllers = {}
    
    # Générer le statut pour jusqu'à 20 lobbies
    for i in range(1, 21):
        lobby_id = f"lobby{i}"
        
        # Vérifier si une manette est connectée pour ce lobby
        # Pour l'instant, on utilise le même contrôleur pour tous les lobbies
        # Tu peux modifier cette logique pour gérer plusieurs contrôleurs
        if nizua_server.controller and nizua_server.controller.gamepad:
            controllers[lobby_id] = {
                "connected": True,
                "movement_enabled": getattr(nizua_server.controller, 'movement_enabled', False),
                "anti_afk_enabled": getattr(nizua_server.controller, 'anti_afk_enabled', False),
                "controller_id": i  # ID unique pour chaque lobby
            }
        else:
            controllers[lobby_id] = {
                "connected": False,
                "movement_enabled": False,
                "anti_afk_enabled": False,
                "controller_id": i
            }
    
    return jsonify({
        "controllers": controllers,
        "total_lobbies": 20,
        "connected_count": sum(1 for c in controllers.values() if c["connected"])
    })

@app.route('/api/controller/movement', methods=['POST'])
def toggle_movement():
    """Activer/désactiver le mouvement"""
    result = nizua_server.toggle_movement()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/anti-afk', methods=['POST'])
def toggle_anti_afk():
    """Activer/désactiver l'anti-AFK"""
    result = nizua_server.toggle_anti_afk()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/select-class', methods=['POST'])
def select_class():
    """Sélectionner une classe"""
    result = nizua_server.select_class()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/config', methods=['GET'])
def get_gamepad_config():
    """Obtenir la configuration gamepad complète (formatée)"""
    result = nizua_server.get_gamepad_config_formatted()
    status_code = 200 if result.get('success') else 500
    return jsonify(result), status_code

@app.route('/api/controller/config', methods=['POST'])
def save_gamepad_config():
    """Sauvegarder la configuration gamepad complète"""
    try:
        config_data = request.json.get('config')
        if not config_data:
            return jsonify({"error": "Configuration manquante"}), 400
        
        result = nizua_server.save_gamepad_config(config_data)
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/controller/config/reset', methods=['POST'])
def reset_gamepad_config():
    """Réinitialiser la configuration gamepad aux valeurs par défaut"""
    result = nizua_server.reset_gamepad_config_to_default()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/config/parameter', methods=['POST'])
def add_gamepad_parameter():
    """Ajouter un nouveau paramètre"""
    data = request.json
    section = data.get('section')
    key = data.get('key')
    value = data.get('value')
    
    if not all([section, key, value is not None]):
        return jsonify({"error": "Paramètres manquants (section, key, value)"}), 400
    
    result = nizua_server.add_gamepad_parameter(section, key, value)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/config/parameter', methods=['PUT'])
def modify_gamepad_parameter():
    """Modifier un paramètre existant"""
    data = request.json
    section = data.get('section')
    key = data.get('key')
    value = data.get('value')
    
    if not all([section, key, value is not None]):
        return jsonify({"error": "Paramètres manquants (section, key, value)"}), 400
    
    result = nizua_server.modify_gamepad_parameter(section, key, value)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/config/parameter', methods=['DELETE'])
def delete_gamepad_parameter():
    """Supprimer un paramètre"""
    data = request.json
    section = data.get('section')
    key = data.get('key')
    
    if not all([section, key]):
        return jsonify({"error": "Paramètres manquants (section, key)"}), 400
    
    result = nizua_server.delete_gamepad_parameter(section, key)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/controller/config/default', methods=['GET'])
def get_default_gamepad_config():
    """Obtenir la configuration par défaut"""
    default_config = nizua_server.get_default_gamepad_config()
    return jsonify({"success": True, "config": default_config})

# Routes pour la gestion des paramètres gamepad
@app.route('/api/controller/settings', methods=['GET'])
def get_gamepad_settings():
    """Obtenir les paramètres de la manette"""
    result = nizua_server.get_gamepad_settings()
    status_code = 200 if result.get('success') else 500
    return jsonify(result), status_code

@app.route('/api/controller/settings', methods=['POST'])
def update_gamepad_setting():
    """Mettre à jour un paramètre de la manette"""
    data = request.json
    section = data.get('section')
    key = data.get('key')
    value = data.get('value')
    
    if not all([section, key, value is not None]):
        return jsonify({"error": "Paramètres manquants (section, key, value)"}), 400
    
    result = nizua_server.update_gamepad_setting(section, key, value)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

# Routes existantes maintenues
@app.route('/api/games/<int:game_id>', methods=['GET'])
def get_game(game_id):
    """Obtenir les détails d'un jeu spécifique"""
    game = next((g for g in nizua_server.games if g['id'] == game_id), None)
    if game:
        return jsonify(game)
    return jsonify({'error': 'Jeu non trouvé'}), 404

@app.route('/api/games/<int:game_id>/launch', methods=['POST'])
def launch_game(game_id):
    """Lancer un jeu (redirection vers les webviews)"""
    game = next((g for g in nizua_server.games if g['id'] == game_id), None)
    if not game:
        return jsonify({'error': 'Jeu non trouvé'}), 404
    
    if not game.get('installed', False):
        return jsonify({'error': 'Jeu non installé'}), 400
    
    print(f"Redirection vers webview pour le jeu: {game['name']}")
    
    return jsonify({
        'success': True,
        'message': f"Jeu {game['name']} lancé via webview",
        'game_id': game_id,
        'redirect_url': game['path']
    })

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Obtenir les paramètres"""
    return jsonify(nizua_server.settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Mettre à jour les paramètres"""
    try:
        new_settings = request.json
        nizua_server.settings.update(new_settings)
        
        config = {
            'games': nizua_server.games,
            'settings': nizua_server.settings
        }
        
        with open("nizua_config.json", 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        return jsonify({
            'success': True,
            'settings': nizua_server.settings
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lobby/xbox', methods=['GET'])
def get_xbox_info():
    """Obtenir des informations Xbox"""
    return jsonify({
        'lobby_url': nizua_server.xbox_play_url,
        'bo6_url': nizua_server.bo6_url,
        'status': 'available',
        'features': ['Game Pass', 'Xbox Live', 'Cloud Gaming']
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint non trouvé'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erreur interne du serveur'}), 500

def run_server():
    """Démarrer le serveur Flask"""
    print("Démarrage du serveur Nizua Loader avec support gamepad...")
    print("Serveur disponible sur http://localhost:5000")
    print("Système de webviews Electron activé (pas de shortcuts)")
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)

if __name__ == '__main__':
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nArrêt du serveur Nizua Loader")
        sys.exit(0)
    except Exception as e:
        print(f"Erreur lors du démarrage du serveur: {e}")
        sys.exit(1)
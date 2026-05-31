# bot_minecraft

Agent IA local pour Minecraft Java Edition en mode survie. Le bot se connecte à un serveur, écoute les messages de chat qui commencent par `agent`, puis exécute les actions autorisées définies dans le projet.

## Prérequis

- Node.js 18 ou supérieur
- Un serveur Minecraft Java Edition accessible depuis la machine qui lance le bot
- Ollama installé et démarré en local

## Installation

1. Installer les dépendances:

```bash
npm install
```

2. Créer le fichier de configuration à partir du modèle fourni:

```bash
cp .env.example .env
```

3. Ouvrir `.env` et vérifier les variables principales:

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=AgentBot
MC_AUTH=offline
MC_VERSION=
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5-coder:14b
```

## Lancer le projet

1. Démarrer Ollama et charger un modèle:

```bash
ollama run qwen2.5-coder:14b
```

2. Démarrer le serveur Minecraft local ou privé.

3. Lancer le bot:

```bash
npm start
```

Le point d’entrée est [src/bot.js](src/bot.js), qui lit la configuration depuis `.env`, se connecte au serveur et transmet les messages `agent ...` au gestionnaire de commandes.

## Utilisation

Dans le chat Minecraft, chaque message destiné au bot doit commencer par `agent`. Les commandes directes ci-dessous ne nécessitent pas Ollama. Elles tolèrent les variations de casse, d’accents et de ponctuation.

### Commandes directes disponibles

| Commande à envoyer | Effet |
| --- | --- |
| `agent ping` | Vérifie que le bot répond avec `pong`. |
| `agent viens` | Fait venir le bot vers le joueur. |
| `agent viens ici` | Fait venir le bot vers le joueur. |
| `agent suis-moi` | Demande au bot de suivre le joueur. |
| `agent stop` | Arrête le déplacement en cours. |
| `agent ramasse les items` | Ramasse les objets déposés au sol dans un rayon de 8 blocs. |
| `agent statut` | Affiche la vie, la faim et la taille de l’inventaire. |
| `agent reprends` | Reprend la tâche suspendue en mémoire vive. |
| `agent annule la tâche` | Annule la tâche en cours. |
| `agent définis cet endroit comme base` | Enregistre la position actuelle comme base. |
| `agent définis ce coffre comme coffre principal` | Enregistre la position actuelle comme emplacement du coffre principal. |
| `agent dépose ton inventaire dans le coffre` | Rejoint le coffre principal. Le dépôt des objets est encore à implémenter. |

### Demandes en langage naturel

Toute autre commande est transmise à Ollama, puis convertie en une intention autorisée. Les exemples suivants décrivent la liste exhaustive des familles de demandes acceptées par le validateur.

| Famille | Exemples à envoyer dans le chat | Intention interne |
| --- | --- | --- |
| Déplacement | `agent va aux coordonnées 120 64 -30` | `go_to_position` |
| Déplacement mémorisé | `agent retourne à la base` | `return_to_base`, `go_to_saved_location` |
| Mémorisation | `agent mémorise cet endroit` | `save_location`, `save_chest_location` |
| Inventaire | `agent vérifie ton inventaire`, `agent retire 10 blocs du coffre` | `check_inventory`, `withdraw_items` |
| Santé et nourriture | `agent vérifie ta santé`, `agent mange`, `agent trouve de la nourriture` | `check_health`, `eat_food`, `find_food` |
| Sécurité | `agent évite le danger` | `avoid_danger` |
| Recherche | `agent trouve du sable` | `find_resource` |
| Collecte | `agent va chercher 20 blocs de sable`, `agent va chercher un stack de bois` | `collect_resource` |
| Bois | `agent coupe 10 blocs de bois de chêne` | `chop_tree` |
| Minage | `agent mine 16 blocs de pierre`, `agent creuse du gravier` | `mine_block`, `dig_block` |
| Outils | `agent vérifie ton outil`, `agent fabrique une pioche en pierre` | `check_tool`, `craft_tool` |
| Fabrication | `agent fabrique 16 planches de chêne` | `craft_item` |
| Four | `agent transforme 8 blocs de sable en verre` | `smelt_item` |
| Construction | `agent vérifie la zone`, `agent nettoie la zone`, `agent compte les matériaux` | `check_build_area`, `clear_build_area`, `count_required_materials` |
| Bâtiments | `agent construis une petite maison ici` | `build_house`, `build_blueprint` |
| Placement | `agent pose un bloc de pierre ici` | `place_block` |

### Ressources connues

Les noms français sont interprétés par Ollama et convertis vers les identifiants Minecraft suivants :

| Demande courante | Identifiant utilisé |
| --- | --- |
| Bois de chêne | `oak_log` |
| Bois de bouleau | `birch_log` |
| Bois de sapin | `spruce_log` |
| Pierre taillée récupérée en minant | `cobblestone` |
| Pierre | `stone` |
| Charbon | `coal` |
| Sable | `sand` |
| Gravier | `gravel` |
| Minerai de fer | `iron_ore` |
| Laine blanche | `wool` |

Le code connaît également les recettes de planches de chêne, bouleau et sapin, bâtons, table de craft, pioches en bois et en pierre, hache en pierre, torches, porte en chêne, four, verre et vitres.

### Navigation dans les bâtiments

Pendant ses déplacements, le bot privilégie les chemins existants plutôt que le cassage de blocs. Il ouvre une porte en bois ou un portillon avec un seul clic, traverse directement les passages déjà ouverts, utilise les escaliers praticables, et préserve automatiquement les portes, trappes, portillons, escaliers, échelles et échafaudages. Les portes en fer restent utilisables uniquement lorsqu’elles sont déjà ouvertes par un mécanisme du bâtiment.

### Commandes enchaînées

Une même phrase peut contenir plusieurs demandes : le bot les exécute dans l’ordre. Si une nouvelle instruction arrive pendant une tâche longue, elle est ajoutée à la file au lieu de remplacer la tâche en cours. Après avoir coupé ou miné un bloc, le bot attend aussi l’apparition des objets tombés puis va les ramasser.

Exemple : `agent avec le bois que tu as coupé fais un établi et une hache`.

### Limites actuelles

Les commandes directes de déplacement, ramassage, statut et mémorisation fonctionnent. Les demandes libres de recherche et de collecte de ressources sont interprétées par Ollama puis exécutées. Les autres tâches complexes sont encore en cours de développement : la file de tâches n’appelle pas encore les modules de fusion ou construction. Le dépôt effectif dans le coffre est également à implémenter.

Les blueprints autorisés sont `starter_house`, `wood_house`, `storage_room` et `animal_pen`, mais le dossier `blueprints/` et ses fichiers JSON ne sont pas encore présents dans le projet.

## Dépannage

- Si le bot ne se connecte pas, vérifie `MC_HOST`, `MC_PORT` et `MC_USERNAME` dans `.env`.
- Si Mineflayer se fait expulser, assure-toi que le serveur accepte le mode d’authentification indiqué par `MC_AUTH`.
- Si le serveur répond avec `multiplayer.disconnect.unverified_username`, il est probablement en mode en ligne: passe `MC_AUTH=microsoft` avec un compte Microsoft valide, ou désactive le mode en ligne sur le serveur si c'est bien un serveur privé que tu contrôles.
- Si les commandes ne déclenchent rien, vérifie que le message commence bien par `agent`.
- Si l’IA ne répond pas, confirme qu’Ollama est lancé et que `OLLAMA_URL` pointe vers `http://localhost:11434/api/chat`.

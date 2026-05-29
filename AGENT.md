# AGENT.md — Agent IA local pour contrôler un bot Minecraft

## Objectif du projet

Créer un agent IA local capable de contrôler un personnage dans Minecraft Java Edition afin d’exécuter des tâches simples puis progressivement plus complexes.

L’agent doit pouvoir :

- comprendre une instruction en langage naturel ;
- transformer cette instruction en plan d’actions structuré ;
- exécuter uniquement des actions autorisées ;
- contrôler un bot Minecraft via Mineflayer ;
- utiliser un modèle IA local via Ollama ;
- réaliser des tâches composées comme suivre le joueur, ramasser des items, miner des blocs, déposer des ressources, puis construire une maison à un endroit précis.

Le projet doit être conçu de manière progressive, robuste et sécurisée.

---

## Stack technique recommandée

### Minecraft

Utiliser **Minecraft Java Edition** avec un serveur local ou privé.

Serveur conseillé :

- serveur Vanilla local ;
- ou serveur Paper/Spigot local si besoin de plugins.

Éviter les serveurs publics pendant le développement.

---

### Bot Minecraft

Utiliser **Mineflayer** pour créer et contrôler un bot Minecraft.

Dépendances principales :

```bash
npm install mineflayer mineflayer-pathfinder axios dotenv
```

Modules utiles :

- `mineflayer` : connexion du bot et interaction avec Minecraft ;
- `mineflayer-pathfinder` : déplacement automatique ;
- `axios` : appels HTTP vers Ollama ;
- `dotenv` : configuration du serveur Minecraft.

---

### IA locale

Utiliser **Ollama** pour faire tourner un modèle local.

Modèles conseillés :

```bash
ollama run qwen2.5-coder:7b
```

ou, pour une machine moins puissante :

```bash
ollama run llama3.2:3b
```

Le modèle IA ne doit pas contrôler directement Minecraft. Il doit uniquement produire un plan JSON validé par le programme.

---

## Principe d’architecture

L’agent doit être séparé en plusieurs couches.

```text
Joueur Minecraft
    ↓
Message dans le chat : "agent construis une maison ici"
    ↓
Module chat / commande
    ↓
LLM local via Ollama
    ↓
Plan JSON structuré
    ↓
Validateur
    ↓
Planner
    ↓
Actions autorisées
    ↓
Mineflayer
    ↓
Bot Minecraft
```

---

## Règle fondamentale de sécurité

Le modèle IA ne doit jamais exécuter de code libre.

Interdit :

```js
eval(responseFromLLM)
```

Interdit :

```js
new Function(responseFromLLM)()
```

Interdit :

```text
Demander au LLM d’écrire du JavaScript puis l’exécuter automatiquement.
```

Autorisé :

```json
{
  "plan": [
    {"action": "come_to_player"},
    {"action": "collect_nearby_items"}
  ]
}
```

Le programme doit vérifier que chaque action existe dans une liste blanche avant de l’exécuter.

---

## Structure de projet recommandée

```text
minecraft-agent/
├── AGENT.md
├── package.json
├── .env
├── src/
│   ├── bot.js
│   ├── llm.js
│   ├── commandHandler.js
│   ├── planner.js
│   ├── validator.js
│   ├── memory.js
│   ├── actions/
│   │   ├── movement.js
│   │   ├── inventory.js
│   │   ├── mining.js
│   │   ├── building.js
│   │   └── crafting.js
│   ├── builder/
│   │   ├── blueprintLoader.js
│   │   ├── houseGenerator.js
│   │   ├── buildValidator.js
│   │   ├── materialCounter.js
│   │   └── structureBuilder.js
│   └── blueprints/
│       ├── starter_house.json
│       ├── storage_room.json
│       └── animal_pen.json
└── memory.json
```

---

## Fichier `.env`

Créer un fichier `.env` :

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=AgentBot
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5-coder:7b
```

---

## Commandes Minecraft prévues

Le bot doit réagir uniquement aux messages commençant par `agent`.

Exemples :

```text
agent viens ici
agent suis-moi
agent stop
agent ramasse les items
agent mine 5 blocs de chêne
agent définis la maison ici
agent va à la maison
agent construis une petite maison ici
agent construis une maison en 120 64 -40
```

---

## Actions autorisées au début

Créer une liste blanche d’actions.

Exemple :

```js
const ALLOWED_ACTIONS = [
  "come_to_player",
  "follow_player",
  "stop",
  "collect_nearby_items",
  "mine_block",
  "go_to_position",
  "save_location",
  "go_to_saved_location",
  "check_inventory",
  "build_house",
  "build_blueprint"
];
```

Toute action inconnue doit être refusée.

---

## Format JSON attendu du LLM

Le LLM doit répondre uniquement en JSON valide.

Format général :

```json
{
  "plan": [
    {
      "action": "nom_action",
      "params": {}
    }
  ]
}
```

Exemple :

```json
{
  "plan": [
    {
      "action": "come_to_player",
      "params": {}
    }
  ]
}
```

Exemple avec construction :

```json
{
  "plan": [
    {
      "action": "build_house",
      "params": {
        "origin": "player_position",
        "blueprint": "starter_house",
        "size": {
          "width": 7,
          "length": 9,
          "height": 4
        },
        "materials": {
          "walls": "oak_planks",
          "floor": "oak_planks",
          "roof": "stone_bricks",
          "windows": "glass_pane"
        }
      }
    }
  ]
}
```

---

## Prompt système conseillé pour le LLM

Le prompt doit être strict.

```text
Tu contrôles un bot Minecraft.

Tu dois transformer l’instruction du joueur en plan JSON.

Tu dois répondre uniquement avec du JSON valide.
Tu ne dois jamais écrire d’explication.
Tu ne dois jamais écrire de code JavaScript.
Tu ne dois jamais inventer d’action non autorisée.

Actions autorisées :
- come_to_player
- follow_player
- stop
- collect_nearby_items
- mine_block
- go_to_position
- save_location
- go_to_saved_location
- check_inventory
- build_house
- build_blueprint

Format obligatoire :
{
  "plan": [
    {
      "action": "nom_action",
      "params": {}
    }
  ]
}

Si la demande est impossible ou trop vague, réponds :
{
  "plan": [
    {
      "action": "stop",
      "params": {
        "reason": "demande impossible ou trop vague"
      }
    }
  ]
}
```

---

## Module `llm.js`

Responsabilité : appeler Ollama et récupérer un plan JSON.

Pseudo-code :

```js
async function askAgent(instruction, state) {
  const prompt = buildPrompt(instruction, state);

  const response = await axios.post(process.env.OLLAMA_URL, {
    model: process.env.OLLAMA_MODEL,
    stream: false,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.data.message.content;
  return extractJson(content);
}
```

La fonction `extractJson` doit :

- trouver le premier `{` ;
- trouver le dernier `}` ;
- parser le JSON ;
- renvoyer une erreur si le JSON est invalide.

---

## Module `validator.js`

Responsabilité : vérifier le plan avant exécution.

Le validateur doit contrôler :

- présence d’un tableau `plan` ;
- action connue ;
- paramètres valides ;
- coordonnées raisonnables ;
- taille de construction limitée ;
- blocs autorisés ;
- absence de code ;
- absence d’action dangereuse.

Exemple de limites :

```js
const LIMITS = {
  maxPlanLength: 20,
  maxBuildWidth: 20,
  maxBuildLength: 20,
  maxBuildHeight: 15,
  maxMineCount: 64
};
```

---

## Module `planner.js`

Responsabilité : transformer un objectif haut niveau en étapes exécutables.

Exemple :

Instruction :

```text
agent construis une petite maison ici
```

Plan haut niveau :

```json
{
  "action": "build_house",
  "params": {
    "origin": "player_position",
    "blueprint": "starter_house"
  }
}
```

Le planner doit transformer cela en étapes :

```text
1. récupérer la position du joueur
2. charger ou générer le blueprint
3. vérifier que la zone est libre
4. compter les matériaux nécessaires
5. vérifier l’inventaire
6. construire bloc par bloc
7. signaler la fin de construction
```

---

## Module `memory.js`

Responsabilité : sauvegarder des positions importantes.

Fichier `memory.json` :

```json
{
  "home": {
    "x": 120,
    "y": 64,
    "z": -40
  },
  "chest": {
    "x": 123,
    "y": 64,
    "z": -38
  },
  "farm": {
    "x": 140,
    "y": 64,
    "z": -55
  }
}
```

Commandes possibles :

```text
agent définis home ici
agent définis coffre ici
agent va à home
agent va au coffre
```

---

# Exemple d’approfondissement : construction d’une maison

## Objectif

Permettre au joueur d’écrire :

```text
agent construis une petite maison ici
```

ou :

```text
agent construis une maison en 120 64 -40
```

Le bot doit construire automatiquement une maison simple à l’endroit demandé.

---

## Principe de construction

Le LLM ne doit pas générer tous les blocs un par un.

Le LLM doit seulement choisir :

- le type de bâtiment ;
- la taille ;
- les matériaux ;
- la position ;
- éventuellement le style.

Exemple de décision LLM :

```json
{
  "plan": [
    {
      "action": "build_house",
      "params": {
        "origin": "player_position",
        "blueprint": "starter_house",
        "size": {
          "width": 7,
          "length": 9,
          "height": 4
        },
        "materials": {
          "walls": "oak_planks",
          "floor": "oak_planks",
          "roof": "stone_bricks",
          "windows": "glass_pane"
        }
      }
    }
  ]
}
```

Le code doit ensuite générer la liste exacte des blocs à poser.

---

## Étapes détaillées pour construire une maison

La fonction `buildHouse` doit suivre cet ordre :

```text
1. Déterminer l’origine de construction.
2. Générer ou charger le blueprint.
3. Convertir les coordonnées relatives en coordonnées absolues.
4. Vérifier que la zone est libre.
5. Vérifier que le terrain est suffisamment plat.
6. Compter les matériaux nécessaires.
7. Vérifier l’inventaire du bot.
8. Si ressources manquantes, afficher la liste au joueur.
9. Construire le sol.
10. Construire les murs.
11. Ajouter les fenêtres.
12. Ajouter la porte.
13. Construire le toit.
14. Ajouter les torches ou détails.
15. Annoncer la fin de construction.
```

---

## Génération procédurale d’une maison simple

Créer un fichier :

```text
src/builder/houseGenerator.js
```

Fonction recommandée :

```js
function generateStarterHouse(options) {
  const width = options.width || 7;
  const length = options.length || 9;
  const height = options.height || 4;

  const materials = {
    floor: options.materials?.floor || "oak_planks",
    walls: options.materials?.walls || "oak_planks",
    roof: options.materials?.roof || "stone_bricks",
    windows: options.materials?.windows || "glass_pane",
    door: options.materials?.door || "oak_door",
    light: options.materials?.light || "torch"
  };

  const blocks = [];

  // Sol
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < length; z++) {
      blocks.push({ x, y: 0, z, block: materials.floor });
    }
  }

  // Murs
  for (let y = 1; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      blocks.push({ x, y, z: 0, block: materials.walls });
      blocks.push({ x, y, z: length - 1, block: materials.walls });
    }

    for (let z = 1; z < length - 1; z++) {
      blocks.push({ x: 0, y, z, block: materials.walls });
      blocks.push({ x: width - 1, y, z, block: materials.walls });
    }
  }

  // Porte sur la façade avant
  removeBlock(blocks, Math.floor(width / 2), 1, 0);
  removeBlock(blocks, Math.floor(width / 2), 2, 0);

  blocks.push({
    x: Math.floor(width / 2),
    y: 1,
    z: 0,
    block: materials.door
  });

  // Fenêtres simples
  replaceBlock(blocks, 1, 2, 0, materials.windows);
  replaceBlock(blocks, width - 2, 2, 0, materials.windows);
  replaceBlock(blocks, 0, 2, Math.floor(length / 2), materials.windows);
  replaceBlock(blocks, width - 1, 2, Math.floor(length / 2), materials.windows);

  // Toit plat avec débord
  for (let x = -1; x <= width; x++) {
    for (let z = -1; z <= length; z++) {
      blocks.push({ x, y: height + 1, z, block: materials.roof });
    }
  }

  // Torches intérieures simples
  blocks.push({ x: 1, y: 2, z: 1, block: materials.light });
  blocks.push({ x: width - 2, y: 2, z: length - 2, block: materials.light });

  return blocks;
}

function removeBlock(blocks, x, y, z) {
  const index = blocks.findIndex(
    b => b.x === x && b.y === y && b.z === z
  );

  if (index !== -1) {
    blocks.splice(index, 1);
  }
}

function replaceBlock(blocks, x, y, z, block) {
  removeBlock(blocks, x, y, z);
  blocks.push({ x, y, z, block });
}

module.exports = { generateStarterHouse };
```

---

## Format d’un blueprint JSON

Créer un dossier :

```text
src/blueprints/
```

Exemple :

```json
{
  "name": "starter_house",
  "size": {
    "width": 7,
    "length": 9,
    "height": 5
  },
  "blocks": [
    {
      "x": 0,
      "y": 0,
      "z": 0,
      "block": "oak_planks"
    },
    {
      "x": 1,
      "y": 0,
      "z": 0,
      "block": "oak_planks"
    }
  ]
}
```

Les coordonnées sont relatives à l’origine de construction.

---

## Conversion des coordonnées

Si l’origine est :

```json
{
  "x": 120,
  "y": 64,
  "z": -40
}
```

Et que le blueprint contient :

```json
{
  "x": 2,
  "y": 1,
  "z": 3,
  "block": "oak_planks"
}
```

Alors le bloc doit être placé en :

```json
{
  "x": 122,
  "y": 65,
  "z": -37
}
```

---

## Validation de la zone de construction

Avant de construire, vérifier :

- que la zone ne contient pas déjà une structure importante ;
- que le terrain n’est pas trop irrégulier ;
- que le bot peut accéder à la zone ;
- que la taille de la maison respecte les limites ;
- que les blocs sont autorisés ;
- que l’origine est correcte.

Pseudo-code :

```js
function validateBuildArea(bot, origin, size) {
  if (size.width > 20 || size.length > 20 || size.height > 15) {
    throw new Error("Maison trop grande");
  }

  // Vérifier les blocs de la zone
  // Refuser si présence de coffres, fours, lits, etc.
  // Accepter air, herbe, fleurs, hautes herbes si clear_area est prévu.
}
```

Blocs à ne pas détruire automatiquement :

```js
const PROTECTED_BLOCKS = [
  "chest",
  "trapped_chest",
  "furnace",
  "blast_furnace",
  "smoker",
  "bed",
  "crafting_table",
  "enchanting_table",
  "anvil",
  "barrel"
];
```

---

## Calcul des matériaux nécessaires

Avant de construire, compter les blocs du blueprint.

```js
function countRequiredMaterials(blocks) {
  const requirements = {};

  for (const b of blocks) {
    requirements[b.block] = (requirements[b.block] || 0) + 1;
  }

  return requirements;
}
```

Exemple de sortie :

```json
{
  "oak_planks": 168,
  "stone_bricks": 99,
  "glass_pane": 4,
  "oak_door": 1,
  "torch": 2
}
```

---

## Vérification de l’inventaire

Comparer les ressources nécessaires avec l’inventaire du bot.

```js
function checkInventory(bot, requirements) {
  const inventory = {};

  for (const item of bot.inventory.items()) {
    inventory[item.name] = (inventory[item.name] || 0) + item.count;
  }

  const missing = {};

  for (const [item, requiredCount] of Object.entries(requirements)) {
    const available = inventory[item] || 0;

    if (available < requiredCount) {
      missing[item] = requiredCount - available;
    }
  }

  return missing;
}
```

Si des matériaux manquent, le bot doit écrire dans le chat :

```text
Il me manque : 42 oak_planks, 8 glass_pane, 1 oak_door.
```

Ne pas commencer la construction si les ressources manquent.

---

## Ordre de construction

Construire dans cet ordre :

```text
1. sol
2. murs
3. vitres
4. porte
5. toit
6. torches et détails
```

Règle simple : trier les blocs par hauteur croissante.

```js
blocks.sort((a, b) => a.y - b.y);
```

Pour une construction plus propre, ajouter un champ `phase` :

```json
{
  "x": 0,
  "y": 0,
  "z": 0,
  "block": "oak_planks",
  "phase": "floor"
}
```

Puis construire par phase.

---

## Placement des blocs

Dans Minecraft, un bloc ne peut pas toujours être posé directement dans le vide. Il faut souvent un bloc adjacent comme support.

La fonction `placeBlockAt` doit :

```text
1. trouver l’item correspondant dans l’inventaire ;
2. équiper l’item ;
3. trouver un bloc adjacent utilisable comme support ;
4. se déplacer près du point de placement ;
5. poser le bloc ;
6. vérifier que le bloc a bien été posé.
```

Pseudo-code :

```js
async function placeBlockAt(bot, targetPos, blockName) {
  const item = bot.inventory.items().find(item => item.name === blockName);

  if (!item) {
    throw new Error(`Bloc manquant : ${blockName}`);
  }

  await bot.equip(item, "hand");

  const reference = findReferenceBlock(bot, targetPos);

  if (!reference) {
    throw new Error(`Aucun bloc de support pour ${targetPos}`);
  }

  await moveNear(bot, targetPos);

  const faceVector = targetPos.minus(reference.position);
  await bot.placeBlock(reference, faceVector);
}
```

---

## Gestion des erreurs pendant la construction

Le builder doit savoir s’arrêter proprement.

Cas à gérer :

- bloc manquant ;
- chemin impossible ;
- mob qui bloque ;
- chute du bot ;
- bloc impossible à poser ;
- zone devenue occupée ;
- joueur demande `agent stop`.

Prévoir un état global :

```js
const buildState = {
  running: false,
  paused: false,
  currentTask: null,
  currentBlockIndex: 0
};
```

Commandes utiles :

```text
agent stop
agent pause
agent resume
agent status
```

---

## Comportement attendu pour la maison

Quand le joueur dit :

```text
agent construis une petite maison ici
```

Le bot doit répondre :

```text
Je prépare une maison starter_house en X Y Z.
```

Puis :

```text
Zone vérifiée : OK.
```

Puis, si ressources manquantes :

```text
Il me manque : 120 oak_planks, 4 glass_pane, 1 oak_door.
```

Sinon :

```text
Construction lancée.
```

À la fin :

```text
Maison terminée.
```

---

## Gestion du mode créatif et du mode survie

### Mode créatif

Le mode créatif est plus simple pour développer.

Le bot peut construire directement sans se soucier des ressources.

Utiliser ce mode pour tester :

- génération du blueprint ;
- placement des blocs ;
- navigation ;
- orientation ;
- robustesse du builder.

---

### Mode survie

En survie, il faut :

- vérifier l’inventaire ;
- collecter les ressources ;
- crafter si nécessaire ;
- revenir à la zone ;
- construire.

Ne pas commencer par la survie complète. Commencer par le mode créatif ou par un inventaire déjà rempli.

---

## Roadmap conseillée

### Étape 1 — Bot simple

Objectif : connecter le bot au serveur Minecraft.

À faire :

- créer `bot.js` ;
- connecter Mineflayer ;
- lire le chat ;
- répondre à `agent ping`.

---

### Étape 2 — Déplacement

Objectif : faire venir le bot vers le joueur.

Actions à coder :

- `come_to_player` ;
- `follow_player` ;
- `stop`.

---

### Étape 3 — LLM local

Objectif : transformer une phrase en plan JSON.

À faire :

- installer Ollama ;
- créer `llm.js` ;
- forcer la réponse JSON ;
- valider les actions.

---

### Étape 4 — Actions Minecraft simples

Objectif : rendre le bot utile.

Actions :

- ramasser les items proches ;
- miner un bloc précis ;
- aller à une position ;
- sauvegarder des positions.

---

### Étape 5 — Mémoire

Objectif : mémoriser des lieux.

Commandes :

```text
agent définis home ici
agent va à home
agent définis coffre ici
agent va au coffre
```

---

### Étape 6 — Construction simple

Objectif : générer une maison simple et la construire.

À faire :

- créer `houseGenerator.js` ;
- créer `materialCounter.js` ;
- créer `buildValidator.js` ;
- créer `structureBuilder.js` ;
- coder `build_house`.

---

### Étape 7 — Blueprints

Objectif : construire des structures prédéfinies.

À faire :

- créer des fichiers JSON de structures ;
- charger un blueprint ;
- construire selon les coordonnées relatives.

---

### Étape 8 — Structures avancées

Ajouter :

- toit en escaliers ;
- orientation de la maison ;
- fenêtres plus propres ;
- coffre intérieur ;
- lit ;
- ferme automatique ;
- enclos à animaux ;
- salle de stockage.

---

## Bonnes pratiques

Toujours faire simple au début.

Ne pas chercher à créer un agent totalement autonome immédiatement.

Priorité :

```text
1. fiabilité
2. sécurité
3. actions simples
4. tâches composées
5. créativité
```

Le LLM doit être utilisé pour comprendre la demande et choisir une stratégie, pas pour remplacer tout le code.

Le code doit rester déterministe pour les actions critiques :

- déplacement ;
- minage ;
- inventaire ;
- placement de blocs ;
- construction.

---

## Résumé de l’architecture finale

```text
LLM local avec Ollama
    ↓
Comprend l’ordre du joueur
    ↓
Produit un plan JSON
    ↓
Validator refuse les actions invalides
    ↓
Planner transforme l’objectif en sous-étapes
    ↓
Actions Mineflayer exécutées une par une
    ↓
Builder construit les structures avec des blueprints
    ↓
Bot Minecraft agit dans le monde
```

---

## Exemple final attendu

Commande joueur :

```text
agent construis une petite maison ici
```

Réponse LLM :

```json
{
  "plan": [
    {
      "action": "build_house",
      "params": {
        "origin": "player_position",
        "blueprint": "starter_house",
        "size": {
          "width": 7,
          "length": 9,
          "height": 4
        },
        "materials": {
          "walls": "oak_planks",
          "floor": "oak_planks",
          "roof": "stone_bricks",
          "windows": "glass_pane"
        }
      }
    }
  ]
}
```

Exécution attendue :

```text
1. Le bot récupère la position du joueur.
2. Il génère la maison starter_house.
3. Il vérifie la zone.
4. Il calcule les ressources.
5. Il vérifie son inventaire.
6. Il construit le sol.
7. Il construit les murs.
8. Il ajoute porte et fenêtres.
9. Il construit le toit.
10. Il annonce que la maison est terminée.
```

---

## Priorité immédiate pour coder

Commencer par coder dans cet ordre :

```text
1. bot.js
2. commandHandler.js
3. llm.js
4. validator.js
5. movement.js
6. memory.js
7. houseGenerator.js
8. materialCounter.js
9. buildValidator.js
10. structureBuilder.js
```

Ne pas passer à l’étape suivante tant que l’étape actuelle n’est pas testée.


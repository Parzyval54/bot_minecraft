# AGENT.md — Agent IA local Minecraft en survie

## Objectif du projet

Créer un agent IA local capable de contrôler un personnage dans **Minecraft Java Edition en mode survie**.

L'agent ne doit pas seulement exécuter des actions simples. Il doit être capable de :

- comprendre une instruction en langage naturel ;
- transformer cette instruction en objectif structuré ;
- décomposer l'objectif en sous-tâches ;
- estimer les ressources nécessaires ;
- vérifier son inventaire ;
- aller chercher les ressources manquantes ;
- crafter les objets nécessaires ;
- gérer sa sécurité, sa nourriture, ses outils et son chemin ;
- revenir au chantier ;
- exécuter la tâche finale, par exemple construire une maison à un endroit précis.

Le projet doit être conçu progressivement. L'agent ne doit pas être totalement libre. Il doit utiliser des actions prédéfinies, validées et sécurisées.

---

## Idée centrale

En survie, une consigne comme :

```text
agent construis une petite maison ici
```

ne signifie pas seulement :

```text
poser des blocs
```

Elle signifie plutôt :

```text
1. comprendre le type de maison demandé ;
2. choisir un modèle de maison ;
3. déterminer les matériaux nécessaires ;
4. vérifier l'inventaire ;
5. identifier les ressources manquantes ;
6. trouver où récupérer ces ressources ;
7. fabriquer les blocs nécessaires ;
8. nettoyer et préparer la zone ;
9. construire la maison ;
10. gérer les erreurs et interruptions.
```

L'agent doit donc être organisé comme un **planner de survie**, pas seulement comme un bot de construction.

---

## Stack technique recommandée

### Minecraft

Utiliser **Minecraft Java Edition** avec un serveur local ou privé.

Serveur conseillé :

- serveur Vanilla local ;
- ou serveur Paper/Spigot local si besoin de plugins.

Pendant le développement, éviter les serveurs publics.

---

### Bot Minecraft

Utiliser **Mineflayer** pour créer et contrôler le bot.

Dépendances de base :

```bash
npm install mineflayer mineflayer-pathfinder axios dotenv
```

Dépendances utiles à ajouter progressivement :

```bash
npm install vec3 minecraft-data prismarine-block prismarine-item
```

Modules importants :

- `mineflayer` : connexion et interactions Minecraft ;
- `mineflayer-pathfinder` : déplacement automatique ;
- `minecraft-data` : données sur les blocs, items, recettes, outils ;
- `vec3` : manipulation des coordonnées ;
- `axios` : appels HTTP vers Ollama ;
- `dotenv` : configuration.

---

### IA locale

Utiliser **Ollama** pour faire tourner un modèle local.

Modèle conseillé :

```bash
ollama run qwen2.5-coder:7b
```

Alternative plus légère :

```bash
ollama run llama3.2:3b
```

Le modèle IA ne doit pas contrôler Minecraft directement. Il doit seulement produire des plans JSON validés par le programme.

---

## Architecture globale

```text
Joueur Minecraft
    ↓
Commande : "agent construis une maison ici"
    ↓
commandHandler.js
    ↓
LLM local via Ollama
    ↓
Objectif JSON structuré
    ↓
validator.js
    ↓
survivalPlanner.js
    ↓
Sous-objectifs : ressources, craft, sécurité, construction
    ↓
actions autorisées
    ↓
Mineflayer
    ↓
Bot Minecraft en survie
```

L'agent doit avoir deux niveaux de décision :

```text
Niveau 1 — LLM
Comprend la demande, choisit une intention, produit un objectif structuré.

Niveau 2 — Code déterministe
Planifie, valide, collecte, craft, construit, gère les erreurs.
```

---

## Règle de sécurité fondamentale

Le LLM ne doit jamais générer du code libre à exécuter.

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
Demander au LLM d'écrire du JavaScript puis l'exécuter automatiquement.
```

Autorisé :

```json
{
  "goal": "build_house",
  "location": "player_position",
  "blueprint": "starter_house",
  "constraints": {
    "mode": "survival",
    "allow_resource_gathering": true
  }
}
```

Le programme doit ensuite vérifier, découper et exécuter uniquement des actions connues.

---

## Structure de projet recommandée

```text
minecraft-agent/
├── AGENT.md
├── package.json
├── .env
├── memory.json
├── src/
│   ├── bot.js
│   ├── llm.js
│   ├── commandHandler.js
│   ├── validator.js
│   ├── survivalPlanner.js
│   ├── taskQueue.js
│   ├── memory.js
│   ├── state/
│   │   ├── worldState.js
│   │   ├── inventoryState.js
│   │   ├── dangerState.js
│   │   └── botStatus.js
│   ├── actions/
│   │   ├── movement.js
│   │   ├── inventory.js
│   │   ├── mining.js
│   │   ├── collecting.js
│   │   ├── crafting.js
│   │   ├── smelting.js
│   │   ├── combat.js
│   │   ├── food.js
│   │   └── building.js
│   ├── survival/
│   │   ├── resourcePlanner.js
│   │   ├── resourceFinder.js
│   │   ├── toolPlanner.js
│   │   ├── craftingPlanner.js
│   │   ├── safetyManager.js
│   │   └── recoveryManager.js
│   ├── builder/
│   │   ├── blueprintLoader.js
│   │   ├── houseGenerator.js
│   │   ├── buildValidator.js
│   │   ├── materialCounter.js
│   │   ├── structureBuilder.js
│   │   └── placementHelper.js
│   └── blueprints/
│       ├── starter_house.json
│       ├── wood_house.json
│       ├── storage_room.json
│       └── animal_pen.json
└── logs/
    ├── tasks.log
    └── errors.log
```

---

## Fichier `.env`

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=AgentBot
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5-coder:7b
```

---

## Commandes Minecraft prévues

Le bot doit uniquement réagir aux messages commençant par `agent`.

Exemples :

```text
agent viens ici
agent suis-moi
agent stop
agent ramasse les items
agent mine 5 blocs de bois
agent construis une petite maison ici
agent construis une maison en 120 64 -40
agent prépare les ressources pour une maison
agent reprends la construction
agent dépose ton inventaire dans le coffre
agent définis ce coffre comme coffre principal
agent définis cet endroit comme base
```

---

## Actions autorisées

Créer une liste blanche d'actions. Toute action inconnue doit être refusée.

```js
const ALLOWED_ACTIONS = [
  // Mouvement
  "come_to_player",
  "follow_player",
  "stop",
  "go_to_position",
  "go_to_saved_location",

  // Mémoire
  "save_location",
  "save_chest_location",

  // Inventaire
  "check_inventory",
  "deposit_items",
  "withdraw_items",
  "collect_nearby_items",

  // Survie
  "check_health",
  "eat_food",
  "find_food",
  "avoid_danger",
  "return_to_base",

  // Ressources
  "find_resource",
  "collect_resource",
  "mine_block",
  "chop_tree",
  "dig_block",

  // Outils et craft
  "check_tool",
  "craft_item",
  "craft_tool",
  "smelt_item",

  // Construction
  "check_build_area",
  "clear_build_area",
  "count_required_materials",
  "build_house",
  "build_blueprint",
  "place_block"
];
```

---

## Format JSON attendu du LLM

Le LLM doit répondre uniquement en JSON valide.

Exemple pour une maison :

```json
{
  "goal": "build_house",
  "location": "player_position",
  "blueprint": "starter_house",
  "style": "simple_survival",
  "constraints": {
    "mode": "survival",
    "allow_resource_gathering": true,
    "allow_crafting": true,
    "allow_tree_cutting": true,
    "allow_mining": true,
    "avoid_night_work": true,
    "return_to_base_if_inventory_full": true
  }
}
```

Le LLM ne doit pas produire une liste de milliers de blocs à poser. Il doit produire une intention structurée. Le code se charge ensuite de générer le plan détaillé.

---

## État transmis au LLM

Le LLM doit recevoir un état résumé, pas tout le monde Minecraft brut.

Exemple :

```json
{
  "bot": {
    "position": {"x": 120, "y": 64, "z": -40},
    "health": 20,
    "food": 17,
    "is_day": true,
    "dimension": "overworld"
  },
  "player": {
    "position": {"x": 123, "y": 64, "z": -42}
  },
  "inventory": [
    {"name": "oak_log", "count": 12},
    {"name": "stone_pickaxe", "count": 1},
    {"name": "bread", "count": 3}
  ],
  "memory": {
    "base": {"x": 100, "y": 64, "z": -20},
    "main_chest": {"x": 102, "y": 64, "z": -22}
  },
  "nearby": {
    "trees": true,
    "water": false,
    "hostile_mobs": false,
    "dropped_items": true
  }
}
```

---

# Partie survie : logique obligatoire

## 1. L'agent doit estimer les ressources nécessaires

Avant toute tâche complexe, l'agent doit compter les ressources.

Pour une maison, utiliser :

```text
blueprint → liste de blocs → compteur de matériaux
```

Exemple :

```json
{
  "oak_planks": 180,
  "oak_door": 1,
  "glass_pane": 8,
  "torch": 4,
  "cobblestone": 32
}
```

Puis comparer avec l'inventaire.

Exemple de résultat :

```json
{
  "missing": {
    "oak_planks": 132,
    "glass_pane": 8,
    "torch": 4
  }
}
```

---

## 2. L'agent doit connaître les équivalences de ressources

En survie, il faut convertir les ressources brutes en blocs finaux.

Exemples :

```text
1 oak_log → 4 oak_planks
6 oak_planks → 3 oak_door
1 coal + 1 stick → 4 torch
2 oak_planks → 4 stick
sand → smelting → glass
6 glass → 16 glass_pane
cobblestone → four / outils / blocs de construction
```

Il faut créer un module `resourcePlanner.js` capable de répondre :

```text
Pour obtenir 180 oak_planks, il faut 45 oak_log.
Pour obtenir 8 glass_pane, il faut 6 glass, donc 6 sand + cuisson.
Pour obtenir 4 torches, il faut 1 coal et 1 stick.
```

---

## 3. L'agent doit savoir aller chercher les ressources

Créer un module `resourceFinder.js`.

Il doit savoir trouver :

```text
oak_log       → chercher un arbre proche
birch_log     → chercher un bouleau proche
cobblestone   → miner de la stone avec une pioche
sand          → chercher sable près de l'eau ou biome adapté
coal          → miner charbon visible ou utiliser charcoal
food          → inventaire, animaux, cultures, coffre
wool          → moutons ou coffre
```

Important : pour une première version, ne pas chercher trop loin. Définir une limite :

```js
const MAX_SEARCH_RADIUS = 64;
const MAX_RESOURCE_ATTEMPTS = 3;
```

Si la ressource n'est pas trouvée, le bot doit demander de l'aide ou utiliser une alternative.

Exemple :

```text
Je n'ai pas trouvé de charbon proche. Je peux fabriquer du charbon de bois si j'ai du bois et un four.
```

---

## 4. L'agent doit gérer les alternatives

Pour ne pas bloquer, l'agent doit avoir des ressources alternatives.

Exemples :

```text
Torches :
- priorité : coal + stick
- alternative : charcoal + stick

Murs :
- priorité : oak_planks
- alternative : birch_planks, spruce_planks, cobblestone

Fenêtres :
- priorité : glass_pane
- alternative : laisser des ouvertures sans vitre

Toit :
- priorité : cobblestone ou oak_stairs
- alternative v1 : toit plat en planks
```

Créer une table :

```js
const MATERIAL_ALTERNATIVES = {
  oak_planks: ["birch_planks", "spruce_planks", "cobblestone"],
  coal: ["charcoal"],
  glass_pane: ["glass", "air"],
  oak_door: ["birch_door", "spruce_door"]
};
```

---

## 5. L'agent doit gérer les outils

Avant de miner ou couper, il doit vérifier les outils.

Exemples :

```text
Pour couper du bois : axe recommandé, main autorisée si petite quantité.
Pour miner de la stone : pioche obligatoire.
Pour miner du charbon : pioche obligatoire.
Pour miner du fer : pioche en pierre minimum.
```

Créer un module `toolPlanner.js`.

Pseudo-logique :

```text
Si besoin de cobblestone :
  vérifier pioche.
  si pas de pioche :
    vérifier sticks + planks.
    crafter wooden_pickaxe.
    miner 3 cobblestone.
    crafter stone_pickaxe.
```

---

## 6. L'agent doit gérer le crafting

Créer un module `craftingPlanner.js`.

Le bot doit savoir crafter :

```text
oak_planks
stick
crafting_table
wooden_pickaxe
stone_pickaxe
stone_axe
oak_door
torch
furnace
glass
glass_pane
```

Principe :

```text
1. vérifier si l'item existe déjà dans l'inventaire ;
2. vérifier les ingrédients ;
3. si besoin, poser ou trouver une crafting table ;
4. crafter ;
5. vérifier le résultat.
```

Ne pas essayer de tout crafter dès le début. Commencer avec :

```text
oak_planks
stick
crafting_table
wooden_pickaxe
stone_pickaxe
torch
oak_door
```

---

## 7. L'agent doit gérer la nourriture et la sécurité

Avant toute tâche longue, vérifier :

```text
health >= 12
food >= 10
pas de mobs hostiles proches
pas de lave immédiate
pas de chute dangereuse
```

Créer un module `safetyManager.js`.

Règles simples :

```text
Si health < 10 : revenir à la base ou s'éloigner.
Si food < 8 : manger si possible.
Si food < 6 et pas de nourriture : arrêter la tâche et demander de l'aide.
Si hostile mob proche : fuir vers la base ou vers le joueur.
Si nuit + tâche extérieure longue : demander confirmation ou attendre le jour.
```

Pour la v1, il vaut mieux que le bot soit prudent.

---

## 8. L'agent doit gérer l'inventaire

En survie, l'inventaire peut être plein.

Créer des fonctions :

```text
countInventory(itemName)
hasItem(itemName, count)
getMissingItems(requirements)
depositNonEssentialItems()
withdrawRequiredItems(requirements)
isInventoryFull()
```

Règle recommandée :

```text
Avant une tâche longue :
- garder nourriture ;
- garder outils ;
- garder blocs nécessaires ;
- déposer le reste dans le coffre principal.
```

Il faut donc pouvoir définir un coffre principal :

```text
agent définis ce coffre comme coffre principal
```

Stocker dans `memory.json` :

```json
{
  "main_chest": {"x": 102, "y": 64, "z": -22},
  "base": {"x": 100, "y": 64, "z": -20}
}
```

---

## 9. L'agent doit reprendre après un échec

Les tâches longues doivent être sauvegardées.

Créer `taskQueue.js`.

Une tâche doit avoir :

```json
{
  "id": "task_001",
  "goal": "build_house",
  "status": "running",
  "current_step": 4,
  "origin": {"x": 120, "y": 64, "z": -40},
  "blueprint": "starter_house",
  "remaining_materials": {
    "oak_planks": 32
  }
}
```

Commandes utiles :

```text
agent stop
agent reprends
agent statut
agent annule la tâche
```

---

# Exemple d'approfondissement : construire une maison en survie

## Objectif utilisateur

```text
agent construis une petite maison ici
```

## Résultat attendu

L'agent doit :

```text
1. identifier la position du joueur ;
2. choisir un blueprint simple ;
3. vérifier que la zone est assez plate et libre ;
4. calculer les matériaux ;
5. vérifier l'inventaire et le coffre principal ;
6. aller chercher les ressources manquantes ;
7. crafter les blocs nécessaires ;
8. revenir au chantier ;
9. construire la maison ;
10. poser porte, torches et fenêtres si possible ;
11. signaler clairement ce qui a été fait ou ce qui manque.
```

---

## Blueprint conseillé pour la v1

Maison très simple :

```text
Taille : 7 x 9
Hauteur des murs : 4
Toit : plat
Matériaux :
- sol : oak_planks
- murs : oak_planks
- toit : oak_planks ou cobblestone
- porte : oak_door
- fenêtres : glass_pane facultatif
- lumière : torches facultatif
```

Pourquoi ce choix :

```text
- facile à construire ;
- peu de blocs orientés ;
- pas besoin d'escaliers ;
- peu de risques de bug ;
- ressources faciles à obtenir.
```

---

## Estimation approximative des ressources

Pour une maison 7 x 9 x 4 :

```json
{
  "oak_planks": 180,
  "oak_door": 1,
  "torch": 4,
  "glass_pane": 8
}
```

Conversion approximative :

```text
180 oak_planks → 45 oak_log
1 oak_door → 6 oak_planks → 2 oak_log environ
4 torches → 1 coal ou charcoal + 1 stick
8 glass_pane → 6 sand + cuisson en glass
```

Version minimale possible si l'agent manque de ressources :

```text
- maison sans vitres ;
- torches seulement si charbon disponible ;
- toit en planches ;
- porte obligatoire si possible.
```

---

## Plan JSON interne généré par le planner

Le LLM peut produire :

```json
{
  "goal": "build_house",
  "location": "player_position",
  "blueprint": "starter_house",
  "priority": "complete_basic_shelter",
  "constraints": {
    "survival": true,
    "gather_missing_resources": true,
    "use_alternatives": true,
    "skip_optional_decoration_if_missing": true
  }
}
```

Le `survivalPlanner.js` transforme ensuite cela en étapes :

```json
{
  "steps": [
    {"action": "save_build_origin"},
    {"action": "load_blueprint", "name": "starter_house"},
    {"action": "check_build_area"},
    {"action": "count_required_materials"},
    {"action": "check_inventory_and_chest"},
    {"action": "plan_missing_resources"},
    {"action": "gather_resources"},
    {"action": "craft_required_items"},
    {"action": "return_to_build_origin"},
    {"action": "clear_build_area"},
    {"action": "build_blueprint"},
    {"action": "report_result"}
  ]
}
```

---

## Détail de l'étape `plan_missing_resources`

Exemple :

```json
{
  "required": {
    "oak_planks": 180,
    "oak_door": 1,
    "torch": 4,
    "glass_pane": 8
  },
  "available": {
    "oak_planks": 48,
    "oak_log": 10,
    "coal": 2,
    "stick": 4
  },
  "missing_plan": [
    {
      "target": "oak_planks",
      "missing": 92,
      "raw_resource": "oak_log",
      "raw_needed": 23,
      "method": "chop_tree"
    },
    {
      "target": "glass_pane",
      "missing": 8,
      "raw_resource": "sand",
      "raw_needed": 6,
      "method": "collect_sand_and_smelt",
      "optional": true
    }
  ]
}
```

---

## Logique de collecte de bois

Pseudo-code :

```js
async function gatherWood(bot, requiredLogs) {
  while (countInventory(bot, "oak_log") < requiredLogs) {
    await safetyManager.check(bot);

    const tree = await resourceFinder.findNearestTree(bot, 64);
    if (!tree) {
      throw new Error("Aucun arbre trouvé dans le rayon autorisé.");
    }

    await movement.goNear(bot, tree.position);
    await toolPlanner.ensureAxeOrAllowHand(bot);
    await mining.chopTree(bot, tree);
    await collecting.collectNearbyItems(bot);

    if (inventory.isFull(bot)) {
      await inventory.returnToChestAndDeposit(bot);
    }
  }
}
```

Règles :

```text
- couper tout le tronc accessible ;
- ramasser les logs au sol ;
- ne pas partir trop loin ;
- revenir au chantier ou au coffre après collecte ;
- si aucun arbre n'est trouvé, demander au joueur d'indiquer une zone boisée.
```

---

## Logique de craft

Exemple pour les planches :

```js
async function craftPlanksForHouse(bot, requiredPlanks) {
  const currentPlanks = countInventory(bot, "oak_planks");
  const missingPlanks = requiredPlanks - currentPlanks;

  if (missingPlanks <= 0) return;

  const logsNeeded = Math.ceil(missingPlanks / 4);

  if (countInventory(bot, "oak_log") < logsNeeded) {
    await gatherWood(bot, logsNeeded);
  }

  await crafting.craftItem(bot, "oak_planks", missingPlanks);
}
```

---

## Logique de construction

Le builder doit être déterministe.

Règles :

```text
- construire du bas vers le haut ;
- poser le sol avant les murs ;
- poser les murs avant le toit ;
- poser les détails à la fin ;
- ne pas poser de bloc si le bon bloc est déjà présent ;
- si un bloc manque, utiliser une alternative ou mettre la tâche en pause.
```

Pseudo-code :

```js
async function buildStructure(bot, origin, blueprint) {
  const blocks = blueprint.blocks;

  blocks.sort((a, b) => a.y - b.y);

  for (const block of blocks) {
    await safetyManager.check(bot);

    const worldPos = origin.offset(block.x, block.y, block.z);
    const current = bot.blockAt(worldPos);

    if (current && current.name === block.block) {
      continue;
    }

    if (!inventory.hasItem(bot, block.block, 1)) {
      const alternative = findAlternative(block.block);

      if (alternative && inventory.hasItem(bot, alternative, 1)) {
        await placeBlockAt(bot, worldPos, alternative);
      } else if (block.optional) {
        continue;
      } else {
        await taskQueue.pause("Bloc manquant : " + block.block);
        return;
      }
    } else {
      await placeBlockAt(bot, worldPos, block.block);
    }
  }
}
```

---

## Vérification de la zone de construction

Avant de construire :

```text
- vérifier largeur et longueur ;
- vérifier que le sol est à peu près plat ;
- vérifier qu'il n'y a pas d'eau/lave ;
- vérifier qu'il n'y a pas de coffre important à détruire ;
- vérifier que le bot peut accéder au chantier ;
- nettoyer seulement les blocs simples : grass, dirt, leaves, flowers.
```

Pour la v1, ne pas terraformer lourdement. Si le terrain est mauvais, répondre :

```text
La zone n'est pas assez plate. Choisis un endroit plus plat ou autorise le nivellement.
```

---

## Gestion des blocs optionnels

Les détails doivent être facultatifs.

Exemple :

```json
{
  "x": 2,
  "y": 2,
  "z": 0,
  "block": "glass_pane",
  "optional": true,
  "fallback": "air"
}
```

Si l'agent n'a pas de verre, il laisse une ouverture.

Priorités :

```text
Obligatoire : sol, murs, toit minimal.
Important : porte.
Optionnel : vitres, torches, décoration.
```

---

## Messages de statut attendus

L'agent doit informer le joueur clairement.

Exemples :

```text
Je vais construire une maison simple ici.
Matériaux estimés : 180 planches, 1 porte, 4 torches, 8 vitres.
Il me manque 23 logs. Je vais couper du bois proche.
Je n'ai pas trouvé de sable proche, je construis sans vitres.
Construction en cours : murs terminés, toit en cours.
Maison terminée. Les fenêtres sont vides car il manquait du verre.
```

---

## Priorités de développement

### Version 1 — Base fiable

Objectif : un bot capable de faire des actions simples.

À coder :

```text
- connexion Mineflayer ;
- commandes chat ;
- follow / come / stop ;
- lecture inventaire ;
- déplacement vers position ;
- mémoire base et coffre ;
- ramassage items proches.
```

---

### Version 2 — Survie minimale

Objectif : obtenir les ressources simples.

À coder :

```text
- trouver arbre proche ;
- couper arbre ;
- ramasser logs ;
- crafter planches ;
- crafter sticks ;
- crafter crafting table ;
- déposer/reprendre dans coffre ;
- vérifier nourriture et vie.
```

---

### Version 3 — Construction simple

Objectif : construire une maison basique en bois.

À coder :

```text
- générateur de maison 7 x 9 ;
- compteur de matériaux ;
- vérification zone ;
- pose bloc par bloc ;
- reprise si bloc manquant ;
- rapport de statut.
```

---

### Version 4 — Craft et alternatives

Objectif : rendre l'agent plus autonome.

À coder :

```text
- fabriquer outils ;
- fabriquer porte ;
- fabriquer torches ;
- utiliser charbon ou charbon de bois ;
- récupérer sable ;
- cuire verre ;
- construire avec variantes de bois.
```

---

### Version 5 — Tâches longues robustes

Objectif : agent réellement utile en survie.

À coder :

```text
- task queue persistante ;
- pause / reprise ;
- gestion nuit / mobs ;
- retour base automatique ;
- collecte multi-ressources ;
- reprise après mort ou déconnexion.
```

---

## Règles de robustesse

L'agent doit toujours :

```text
- vérifier avant d'agir ;
- refuser une action dangereuse ;
- ne pas partir trop loin ;
- ne pas casser les coffres ou blocs importants ;
- sauvegarder les tâches longues ;
- prévenir quand une ressource manque ;
- utiliser des alternatives simples ;
- demander de l'aide si la situation est trop complexe.
```

---

## Ce que le LLM doit faire

Le LLM doit :

```text
- comprendre la commande ;
- choisir un objectif ;
- choisir un blueprint ;
- identifier les contraintes ;
- produire du JSON propre ;
- ne jamais inventer d'action non autorisée ;
- ne jamais générer de code à exécuter.
```

---

## Ce que le code doit faire

Le code doit :

```text
- valider le JSON ;
- refuser les actions inconnues ;
- générer les plans détaillés ;
- compter les ressources ;
- gérer les déplacements ;
- gérer les outils ;
- gérer le craft ;
- construire bloc par bloc ;
- sauvegarder l'état ;
- gérer les erreurs.
```

---

## Exemple de prompt système pour le LLM

```text
Tu contrôles un agent Minecraft en mode survie.

Tu ne dois jamais écrire de code.
Tu ne dois jamais produire autre chose que du JSON valide.
Tu dois choisir uniquement des objectifs connus.

Objectifs autorisés :
- come_to_player
- follow_player
- collect_nearby_items
- build_house
- gather_resource
- deposit_items
- go_to_saved_location

Pour une construction, tu ne dois pas lister tous les blocs.
Tu dois choisir un blueprint, une position et des contraintes.

Si la commande est ambiguë, choisis l'interprétation la plus simple et la plus sûre.
```

---

## Conclusion

Pour un agent Minecraft utile en survie, il faut éviter de le rendre trop libre.

La bonne architecture est :

```text
LLM local
→ comprend la demande
→ produit un objectif JSON
→ planner de survie
→ calcule ressources et sous-tâches
→ actions déterministes
→ Mineflayer contrôle le bot
```

Pour l'exemple de la maison, le plus important est de ne pas commencer par une maison complexe. Il faut d'abord réussir une maison simple en bois, avec collecte automatique des logs, craft des planches, vérification de la zone, puis construction bloc par bloc.

Une fois cette base fiable, l'agent pourra progressivement apprendre à construire des structures plus complexes, utiliser des schematics, gérer plusieurs coffres, miner, crafter et reprendre des tâches longues.

# relier_serveur.md

## Rôle de l'agent

Tu es un agent de développement chargé de relier un bot Minecraft Mineflayer à un serveur Minecraft Java local.

Tu dois produire une intégration simple, propre et testable. L'objectif n'est pas encore de créer une IA complexe, mais de vérifier que le bot peut se connecter au serveur comme un joueur, lire le chat, répondre, et exécuter une première commande simple.

---

## Objectif principal

Connecter un bot Mineflayer nommé `agent ` à un serveur Minecraft Java local.

À la fin de cette étape, le bot doit être capable de :

1. Se connecter au serveur local.
2. Apparaître dans le monde comme un joueur.
3. Lire les messages du chat.
4. Répondre dans le chat.
5. Se déplacer vers le joueur avec une commande simple.
6. S'arrêter avec une commande simple.

---

## Architecture attendue

```text
Serveur Minecraft Java local
        ↑
        │ connexion réseau localhost:25565
        │
Bot Mineflayer Node.js
        ↑
        │ commandes dans le chat Minecraft
        │
Joueur humain
```

Le bot doit être traité comme un joueur Minecraft séparé, pas comme un plugin serveur.

---

## Technologies à utiliser

Utiliser obligatoirement :

```text
Node.js
mineflayer
mineflayer-pathfinder
dotenv
```

Ne pas intégrer Ollama, un LLM ou une IA locale dans cette étape. La priorité est d'avoir une base stable de connexion au serveur.

---

## Pré-requis serveur

Le serveur doit être un serveur **Minecraft Java Edition**.

Ne pas utiliser Minecraft Bedrock.

Le serveur doit être lancé localement, généralement sur le port :

```text
25565
```

Si le bot tourne sur la même machine que le serveur, utiliser :

```text
localhost
```

Si le bot tourne sur une autre machine du réseau local, utiliser l'adresse IP locale du serveur qui est

```text
100.96.196.68
```

---

## Configuration recommandée pour les tests locaux

Dans le fichier `server.properties` du serveur Minecraft, utiliser temporairement :

```properties
online-mode=false
white-list=false
spawn-protection=0
difficulty=normal
```

Explications :

- `online-mode=false` permet à Mineflayer de se connecter avec `auth: "offline"`.
- `white-list=false` évite les problèmes de whitelist pendant les premiers tests.
- `spawn-protection=0` évite que le bot soit bloqué près du spawn.
- `difficulty=normal` permet de rester proche d'un environnement de survie.

Après toute modification de `server.properties`, redémarrer complètement le serveur.

---

## Sécurité importante

La configuration suivante est acceptable uniquement pour du développement local :

```properties
online-mode=false
```

Ne jamais exposer publiquement un serveur Minecraft en `online-mode=false`.

Lorsque le bot fonctionne correctement, envisager une configuration plus sécurisée :

```properties
online-mode=true
white-list=true
```

ou au minimum :

```properties
white-list=true
```

Dans ce cas, ajouter le bot à la whitelist :

```mcfunction
/whitelist add AgentBot
/whitelist reload
```

---

## Création du projet

Créer un dossier dédié au bot :

```bash
mkdir minecraft-agent
cd minecraft-agent
npm init -y
```

Installer les dépendances :

```bash
npm install mineflayer mineflayer-pathfinder dotenv
```

La structure minimale attendue est :

```text
minecraft-agent/
├── bot.js
├── .env
└── package.json
```

---

## Fichier `.env`

Créer un fichier `.env` à la racine du projet :

```env
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=agent
MC_AUTH=offline
MC_VERSION=
```

Notes :

- `MC_HOST=localhost` si le bot tourne sur la même machine que le serveur.
- `MC_PORT=25565` sauf si le serveur utilise un autre port.
- `MC_USERNAME=agent` est le nom visible en jeu.
- `MC_AUTH=offline` pour un serveur local en `online-mode=false`.
- `MC_VERSION` peut rester vide au départ.

Si une erreur de protocole apparaît, renseigner explicitement la version Minecraft :

```env
MC_VERSION=1.21.6
```

Adapter la version à celle du serveur.

---

## Fichier `bot.js`

Créer un fichier `bot.js` avec le contenu suivant :

```js
require("dotenv").config();

const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");

const config = {
  host: process.env.MC_HOST || "localhost",
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || "AgentBot",
  auth: process.env.MC_AUTH || "offline"
};

if (process.env.MC_VERSION && process.env.MC_VERSION.trim() !== "") {
  config.version = process.env.MC_VERSION.trim();
}

const bot = mineflayer.createBot(config);

bot.loadPlugin(pathfinder);

bot.once("spawn", () => {
  const movements = new Movements(bot);
  bot.pathfinder.setMovements(movements);

  console.log("Bot connecté au serveur Minecraft.");
  bot.chat("AgentBot connecté.");
});

bot.on("chat", async (username, message) => {
  if (username === bot.username) return;

  console.log(`[CHAT] ${username}: ${message}`);

  if (message === "agent ping") {
    bot.chat("pong");
    return;
  }

  if (message === "agent viens") {
    const player = bot.players[username]?.entity;

    if (!player) {
      bot.chat("Je ne te vois pas.");
      return;
    }

    const pos = player.position;

    bot.pathfinder.setGoal(
      new goals.GoalNear(pos.x, pos.y, pos.z, 1)
    );

    bot.chat("J'arrive.");
    return;
  }

  if (message === "agent stop") {
    bot.pathfinder.setGoal(null);
    bot.chat("J'arrête.");
    return;
  }
});

bot.on("kicked", (reason) => {
  console.error("Bot expulsé du serveur :", reason);
});

bot.on("error", (err) => {
  console.error("Erreur Mineflayer :", err);
});

bot.on("end", () => {
  console.log("Bot déconnecté.");
});
```

---

## Lancement du bot

Démarrer d'abord le serveur Minecraft.

Ensuite, dans le dossier du bot :

```bash
node bot.js
```

Si tout fonctionne, le terminal doit afficher :

```text
Bot connecté au serveur Minecraft.
```

Dans Minecraft, le joueur `AgentBot` doit apparaître dans le monde.

---

## Commandes à tester en jeu

Dans le chat Minecraft, tester :

```text
agent ping
```

Réponse attendue :

```text
pong
```

Tester ensuite :

```text
agentH viens
```

Résultat attendu :

```text
Le bot se déplace vers le joueur.
```

Tester enfin :

```text
agent stop
```

Résultat attendu :

```text
Le bot arrête son déplacement.
```

---

## Vérifications réseau

Si le bot ne se connecte pas, vérifier que le serveur écoute bien sur le port `25565`.

Sous Linux :

```bash
ss -lntp | grep 25565
```

Sous Windows PowerShell :

```powershell
Test-NetConnection localhost -Port 25565
```

Si le serveur est sur une autre machine du réseau local, remplacer `localhost` par l'adresse IP du serveur :

```powershell
Test-NetConnection 192.168.1.42 -Port 25565
```

---

## Erreurs fréquentes et corrections

### 1. Le bot est expulsé immédiatement

Causes probables :

```text
- serveur en online-mode=true alors que le bot utilise auth=offline
- whitelist activée et agentBot non autorisé
- version Minecraft incompatible
- serveur pas complètement démarré
```

Corrections :

```text
- passer temporairement online-mode=false
- désactiver temporairement la whitelist
- ajouter agentBot à la whitelist
- définir MC_VERSION dans .env
- redémarrer le serveur
```

---

### 2. Erreur d'authentification

Si le serveur est en `online-mode=true`, `auth=offline` ne fonctionnera pas.

Option de développement local :

```properties
online-mode=false
```

avec :

```env
MC_AUTH=offline
```

Option avec vrai compte Minecraft :

```env
MC_AUTH=microsoft
MC_USERNAME=email_du_compte_microsoft@example.com
```

Dans ce second cas, Mineflayer pourra demander une authentification Microsoft.

---

### 3. Le bot se connecte mais ne bouge pas

Causes probables :

```text
- mineflayer-pathfinder mal chargé
- le joueur est trop loin
- le bot ne voit pas l'entité du joueur
- le chemin est inaccessible
- des chunks ne sont pas chargés
```

Corrections :

```text
- se rapprocher du bot
- tester dans une zone plate
- vérifier que le bot répond à agent ping
- vérifier les logs du terminal
```

---

### 4. Erreur de version/protocole

Si une erreur liée au protocole ou à la version apparaît, ajouter explicitement la version Minecraft dans `.env` :

```env
MC_VERSION=1.20.4
```

Adapter à la version exacte du serveur.

---

## Cas Docker

Si le serveur Minecraft tourne dans Docker et que le bot tourne sur l'hôte, vérifier que le port est exposé :

```bash
docker ps
```

Il faut voir un mapping du type :

```text
0.0.0.0:25565->25565/tcp
```

Dans ce cas, utiliser :

```env
MC_HOST=localhost
MC_PORT=25565
```

Si le bot tourne aussi dans Docker, utiliser un `docker-compose.yml` et placer le serveur et le bot sur le même réseau Docker.

Exemple conceptuel :

```yaml
services:
  minecraft:
    image: itzg/minecraft-server
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      ONLINE_MODE: "FALSE"

  agent:
    build: ./agent
    environment:
      MC_HOST: minecraft
      MC_PORT: 25565
      MC_USERNAME: agentBot
      MC_AUTH: offline
```

Dans ce cas, le bot doit utiliser :

```env
MC_HOST=minecraft
```

---

## Critères de réussite

L'intégration est considérée comme réussie si :

```text
- le serveur Minecraft démarre correctement
- le script Node.js démarre sans erreur
- agentBot rejoint le serveur
- agentBot répond à "agent ping"
- agentBot se déplace vers le joueur avec "agent viens"
- agentBot s'arrête avec "agent stop"
```

Ne pas passer à l'intégration IA tant que ces critères ne sont pas validés.

---

## Étape suivante après validation

Une fois le lien serveur validé, créer progressivement les modules suivants :

```text
actions/
├── movement.js
├── inventory.js
├── mining.js
├── crafting.js
├── survival.js
└── building.js
```

Puis ajouter :

```text
- collecte de ressources
- gestion d'inventaire
- crafting
- déplacement vers des lieux mémorisés
- construction de structures simples
- intégration d'un LLM local avec sorties JSON
```

L'objectif final est que l'agent puisse recevoir une commande comme :

```text
agent construis une petite maison ici
```

et la transformer en étapes contrôlées :

```text
1. vérifier la zone
2. calculer les ressources nécessaires
3. chercher les ressources manquantes
4. crafter les blocs nécessaires
5. construire la maison avec un blueprint
6. revenir au joueur ou au coffre principal
```

Cette étape finale ne doit pas être commencée tant que la connexion au serveur n'est pas fiable.

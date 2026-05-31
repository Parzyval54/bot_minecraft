/**
 * commandHandler.js — Analyse les commandes du joueur
 *
 * Toute commande commençant par "agent" passe ici.
 * Les commandes simples sont exécutées directement.
 * Les commandes complexes sont envoyées au LLM puis au survivalPlanner.
 */

const { askLLM, getLastLLMError } = require('./llm');
const validator = require('./validator');
const survivalPlanner = require('./survivalPlanner');
const taskQueue = require('./taskQueue');
const memory = require('./memory');
const worldState = require('./state/worldState');
const inventoryState = require('./state/inventoryState');
const botStatus = require('./state/botStatus');
const movement = require('./actions/movement');
const inventory = require('./actions/inventory');

function normalizeDirectInstruction(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Commandes directes sans LLM
const DIRECT_COMMANDS = {
  'ping': 'ping',
  'viens': 'come_to_player',
  'viens ici': 'come_to_player',
  'suis moi': 'follow_player',
  'stop': 'stop',
  'ramasse les items': 'collect_nearby_items',
  'statut': 'report_status',
  'reprends': 'resume_task',
  'annule la tache': 'cancel_task',
  'depose ton inventaire dans le coffre': 'deposit_items'
};

async function executeDirectAction(bot, username, action) {
  switch (action) {
    case 'ping':
      bot.chat('pong');
      return;
    case 'come_to_player':
      bot.chat("J'arrive.");
      await movement.comeToPlayer(bot, username);
      return;
    case 'follow_player':
      await movement.followPlayer(bot, username);
      bot.chat('Je te suis.');
      return;
    case 'stop':
      movement.stop(bot);
      return;
    case 'collect_nearby_items':
      await inventory.collectNearbyItems(bot);
      return;
    case 'report_status': {
      const status = botStatus.getSummary();
      bot.chat(status
        ? `Vie: ${status.health}, faim: ${status.food}, inventaire: ${status.inventory_size}.`
        : 'Statut indisponible.');
      return;
    }
    case 'resume_task':
      await taskQueue.resume(bot);
      return;
    case 'cancel_task':
      await taskQueue.cancel(bot);
      bot.chat('Tache annulee.');
      return;
    case 'deposit_items':
      await inventory.depositNonEssentialItems(bot);
      return;
    default:
      bot.chat('Commande directe non implementee.');
  }
}

/**
 * Point d'entrée principal pour les commandes.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Joueur qui a écrit la commande
 * @param {string} message  - Message complet (commence par "agent")
 */
async function handle(bot, username, message) {
  // Supprimer le préfixe "agent" et nettoyer
  const instruction = message.replace(/^agent\s*/i, '').trim();
  const directInstruction = normalizeDirectInstruction(instruction);

  console.log(`[CMD] Commande reçue de ${username} : "${instruction}"`);

  // 1. Commandes directes
  const directAction = DIRECT_COMMANDS[directInstruction];
  if (directAction) {
    try {
      await executeDirectAction(bot, username, directAction);
    } catch (err) {
      console.error(`[CMD] Echec de "${instruction}" :`, err.message);
      bot.chat(`Impossible d'executer la commande : ${err.message}`);
    }
    return;
  }

  // 2. Définir un coffre principal
  if (directInstruction.includes('definis ce coffre comme coffre principal')) {
    const pos = bot.entity.position.floored();
    memory.set('main_chest', { x: pos.x, y: pos.y, z: pos.z });
    bot.chat('Coffre principal enregistré.');
    return;
  }

  // 3. Définir la base
  if (directInstruction.includes('definis cet endroit comme base')) {
    const pos = bot.entity.position.floored();
    memory.set('base', { x: pos.x, y: pos.y, z: pos.z });
    bot.chat('Base enregistrée.');
    return;
  }

  // 4. Commande complexe → LLM
  bot.chat('Je réfléchis...');
  const state = buildBotState(bot, username);
  const goal = await askLLM(instruction, state);

  if (!goal) {
    const llmError = getLastLLMError();
    bot.chat(llmError ? 'Erreur IA : ' + llmError : "Je n'ai pas compris la demande.");
    return;
  }

  // 5. Valider le JSON produit par le LLM
  const valid = validator.validate(goal);
  if (!valid.ok) {
    bot.chat(`Plan refusé : ${valid.reason}`);
    return;
  }

  // 6. Envoyer au planner de survie
  await survivalPlanner.plan(bot, goal, username);
}

/**
 * Construit l'état résumé transmis au LLM.
 */
function buildBotState(bot, username) {
  const player = bot.players[username];
  return {
    bot: {
      position: bot.entity.position.floored(),
      health: bot.health,
      food: bot.food,
      is_day: bot.time.isDay,
      dimension: 'overworld'
    },
    player: {
      position: player?.entity?.position?.floored() || null
    },
    inventory: inventoryState.getSummary(bot),
    memory: memory.getAll(),
    nearby: worldState.getNearby(bot)
  };
}

module.exports = { handle };

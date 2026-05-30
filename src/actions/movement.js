/**
 * movement.js — Actions de déplacement
 *
 * Utilise mineflayer-pathfinder pour naviguer vers une cible.
 */

const { goals } = require('mineflayer-pathfinder');
const memory = require('../memory');

/**
 * Fait venir le bot vers un joueur.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Nom du joueur cible
 */
async function comeToPlayer(bot, username) {
  const player = bot.players[username];
  if (!player?.entity) {
    bot.chat('Je ne te vois pas.');
    return;
  }
  const { x, y, z } = player.entity.position;
  await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2));
  bot.chat('Me voilà.');
}

/**
 * Fait suivre le bot un joueur (approximation : va vers sa position actuelle).
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Nom du joueur
 */
async function followPlayer(bot, username) {
  const player = bot.players[username];
  if (!player?.entity) return;
  const goal = new goals.GoalFollow(player.entity, 3);
  bot.pathfinder.setGoal(goal, true);
}

/**
 * Arrête tout déplacement.
 *
 * @param {Object} bot - Instance Mineflayer
 */
function stop(bot) {
  bot.pathfinder.setGoal(null);
  bot.chat('Arrêt.');
}

/**
 * Va à une position précise.
 *
 * @param {Object} bot - Instance Mineflayer
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
async function goToPosition(bot, x, y, z) {
  await bot.pathfinder.goto(new goals.GoalBlock(x, y, z));
}

/**
 * Va à un emplacement sauvegardé en mémoire.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {string} name - Clé dans memory.json (ex: "base", "main_chest")
 */
async function goToSavedLocation(bot, name) {
  const loc = memory.get(name);
  if (!loc) {
    bot.chat(`Emplacement "${name}" inconnu.`);
    return;
  }
  await goToPosition(bot, loc.x, loc.y, loc.z);
}

module.exports = { comeToPlayer, followPlayer, stop, goToPosition, goToSavedLocation };

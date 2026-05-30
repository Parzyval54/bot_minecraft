/**
 * combat.js — Actions de combat et fuite
 *
 * Pour la v1, le bot fuit plutôt qu'il ne combat.
 */

const { goToSavedLocation } = require('./movement');

/**
 * Fuit vers la base ou vers le joueur le plus proche.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Joueur de référence pour fuir vers lui si besoin
 */
async function fleeToSafety(bot, username) {
  const memory = require('../memory');
  const base = memory.get('base');

  if (base) {
    bot.chat('Danger ! Je retourne à la base.');
    await goToSavedLocation(bot, 'base');
  } else {
    // Fuir vers le joueur
    const player = bot.players[username];
    if (player?.entity) {
      bot.chat('Danger ! Je viens vers toi.');
      const { goals } = require('mineflayer-pathfinder');
      await bot.pathfinder.goto(
        new goals.GoalNear(
          player.entity.position.x,
          player.entity.position.y,
          player.entity.position.z,
          3
        )
      );
    }
  }
}

module.exports = { fleeToSafety };

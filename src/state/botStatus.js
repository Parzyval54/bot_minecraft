/**
 * botStatus.js — État global du bot (initialisé au spawn)
 */

let _bot = null;

/**
 * Initialise le module avec l'instance bot.
 * @param {Object} bot - Instance Mineflayer
 */
function init(bot) {
  _bot = bot;
}

/**
 * Retourne un résumé de l'état du bot pour les logs ou le chat.
 * @returns {Object}
 */
function getSummary() {
  if (!_bot) return null;

  return {
    position: _bot.entity.position.floored(),
    health: _bot.health,
    food: _bot.food,
    is_day: _bot.time.isDay,
    inventory_size: _bot.inventory.items().length
  };
}

/**
 * Retourne vrai si le bot est opérationnel.
 * @returns {boolean}
 */
function isReady() {
  return _bot !== null && _bot.health > 0;
}

module.exports = { init, getSummary, isReady };

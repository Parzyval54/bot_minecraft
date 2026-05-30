/**
 * inventory.js — Actions sur l'inventaire
 */

const { goToSavedLocation } = require('./movement');
const { countItem, isInventoryFull } = require('../state/inventoryState');
const memory = require('../memory');

/**
 * Dépose les items non essentiels dans le coffre principal.
 *
 * @param {Object} bot            - Instance Mineflayer
 * @param {string[]} keepItems    - Items à conserver (outils, nourriture...)
 */
async function depositNonEssentialItems(bot, keepItems = []) {
  const chestLoc = memory.get('main_chest');
  if (!chestLoc) {
    bot.chat('Pas de coffre principal défini.');
    return;
  }

  await goToSavedLocation(bot, 'main_chest');

  const chestBlock = bot.blockAt(bot.entity.position);
  // TODO : ouvrir le coffre et déposer les items
  bot.chat('Dépôt dans le coffre — à implémenter.');
}

/**
 * Ramasse tous les items au sol à proximité.
 *
 * @param {Object} bot - Instance Mineflayer
 */
async function collectNearbyItems(bot) {
  const items = Object.values(bot.entities).filter(
    (e) => e.type === 'object' && e.objectType === 'Item'
  );

  for (const item of items) {
    if (item.position.distanceTo(bot.entity.position) < 8) {
      await bot.pathfinder.goto(
        new (require('mineflayer-pathfinder').goals.GoalNear)(
          item.position.x, item.position.y, item.position.z, 1
        )
      );
    }
  }
  bot.chat('Items ramassés.');
}

module.exports = { depositNonEssentialItems, collectNearbyItems };

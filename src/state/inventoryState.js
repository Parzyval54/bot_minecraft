/**
 * inventoryState.js — Lecture et analyse de l'inventaire du bot
 */

/**
 * Retourne un résumé de l'inventaire sous forme de tableau.
 * [{ name: "oak_log", count: 12 }, ...]
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {Array}
 */
function getSummary(bot) {
  const items = bot.inventory.items();
  const summary = {};

  for (const item of items) {
    if (summary[item.name]) {
      summary[item.name] += item.count;
    } else {
      summary[item.name] = item.count;
    }
  }

  return Object.entries(summary).map(([name, count]) => ({ name, count }));
}

/**
 * Retourne le nombre d'un item dans l'inventaire.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} itemName - Nom de l'item (ex: "oak_log")
 * @returns {number}
 */
function countItem(bot, itemName) {
  return bot.inventory.items()
    .filter((i) => i.name === itemName)
    .reduce((acc, i) => acc + i.count, 0);
}

/**
 * Vérifie si le bot a au moins `count` exemplaires de `itemName`.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} itemName
 * @param {number} count
 * @returns {boolean}
 */
function hasItem(bot, itemName, count = 1) {
  return countItem(bot, itemName) >= count;
}

/**
 * Retourne les items manquants par rapport aux besoins.
 *
 * @param {Object} bot          - Instance Mineflayer
 * @param {Object} requirements - { oak_planks: 180, oak_door: 1, ... }
 * @returns {Object}            - { oak_planks: 132, ... } (uniquement les manquants)
 */
function getMissingItems(bot, requirements) {
  const missing = {};
  for (const [item, needed] of Object.entries(requirements)) {
    const inInventory = countItem(bot, item);
    if (inInventory < needed) {
      missing[item] = needed - inInventory;
    }
  }
  return missing;
}

/**
 * Vérifie si l'inventaire est plein.
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {boolean}
 */
function isInventoryFull(bot) {
  return bot.inventory.emptySlotCount() === 0;
}

module.exports = { getSummary, countItem, hasItem, getMissingItems, isInventoryFull };

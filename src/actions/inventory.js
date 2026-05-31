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
async function collectNearbyItems(bot, options = {}) {
  const { announce = true, radius = 8, settleMs = 350 } = options;
  if (settleMs > 0) await new Promise(resolve => setTimeout(resolve, settleMs));

  const items = Object.values(bot.entities).filter(
    (entity) => entity.name === 'item' || entity.objectType === 'Item'
  );

  for (const item of items) {
    if (item.position.distanceTo(bot.entity.position) < radius) {
      await bot.pathfinder.goto(
        new (require('mineflayer-pathfinder').goals.GoalNear)(
          item.position.x, item.position.y, item.position.z, 1
        )
      );
    }
  }
  if (announce) bot.chat('Items ramassés.');
}

/**
 * Jette des items de l'inventaire au sol.
 *
 * @param {Object} bot       - Instance Mineflayer
 * @param {string} itemName  - Nom de l'item (ex: 'oak_door'). Si absent, tout jeter.
 * @param {number} count     - Quantité à jeter (défaut : tout le stock).
 */
async function dropItems(bot, itemName, count) {
  if (!itemName) {
    for (const stack of bot.inventory.items()) {
      await bot.tossStack(stack);
    }
    bot.chat('Inventaire vidé.');
    return;
  }

  const itemDef = bot.registry.itemsByName[itemName];
  if (!itemDef) throw new Error(`Item inconnu : ${itemName}`);

  const stacks = bot.inventory.items().filter(i => i.type === itemDef.id);
  if (stacks.length === 0) throw new Error(`Je n'ai pas de ${itemName}.`);

  let remaining = count ?? Infinity;
  for (const stack of stacks) {
    if (remaining <= 0) break;
    const toDrop = isFinite(remaining) ? Math.min(stack.count, remaining) : stack.count;
    await bot.toss(itemDef.id, null, toDrop);
    remaining -= toDrop;
  }
  bot.chat(`${itemName} jeté(s).`);
}

module.exports = { depositNonEssentialItems, collectNearbyItems, dropItems };

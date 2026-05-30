/**
 * craftingPlanner.js — Planifie la séquence de crafting complète
 *
 * Détermine l'ordre optimal pour crafter tous les items nécessaires,
 * en tenant compte des dépendances (ex: d'abord les planks, puis les sticks).
 */

const { craftItem } = require('../actions/crafting');
const { countItem } = require('../state/inventoryState');
const { needsCrafting, CRAFT_RECIPES } = require('./resourcePlanner');

// Items de base à crafter en priorité (ordre)
const CRAFT_PRIORITY = [
  'oak_planks',
  'birch_planks',
  'spruce_planks',
  'stick',
  'crafting_table',
  'wooden_pickaxe',
  'stone_pickaxe',
  'torch',
  'oak_door'
];

/**
 * Exécute le crafting de tous les items d'une liste de besoins.
 *
 * @param {Object} bot          - Instance Mineflayer
 * @param {Object} requirements - { item_name: count_needed }
 */
async function craftAll(bot, requirements) {
  // Trier par priorité connue d'abord, puis le reste
  const items = Object.keys(requirements).sort((a, b) => {
    const ia = CRAFT_PRIORITY.indexOf(a);
    const ib = CRAFT_PRIORITY.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  for (const item of items) {
    if (!needsCrafting(item)) continue;

    const inInventory = countItem(bot, item);
    const needed = requirements[item] - inInventory;
    if (needed <= 0) continue;

    bot.chat(`Crafting de ${needed} ${item}...`);
    const ok = await craftItem(bot, item, needed);
    if (!ok) {
      bot.chat(`Impossible de crafter ${item}.`);
    }
  }
}

module.exports = { craftAll, CRAFT_PRIORITY };

/**
 * toolPlanner.js — Vérifie et prépare les outils nécessaires
 *
 * Avant de miner ou couper, le bot vérifie qu'il a le bon outil.
 * Si non, il le craft si possible.
 */

const { craftItemWithDependencies } = require('../actions/crafting');
const { countItem } = require('../state/inventoryState');

// Outil requis par type de ressource
const TOOL_REQUIREMENTS = {
  stone:      { tool: 'wooden_pickaxe', minimum: true },
  cobblestone:{ tool: 'wooden_pickaxe', minimum: true },
  coal_ore:   { tool: 'wooden_pickaxe', minimum: true },
  iron_ore:   { tool: 'stone_pickaxe',  minimum: true },
  oak_log:    { tool: 'wooden_axe',     minimum: false }, // main autorisée pour petite quantité
  birch_log:  { tool: 'wooden_axe',     minimum: false },
  spruce_log: { tool: 'wooden_axe',     minimum: false }
};

// Recettes de création d'outils (séquence si besoin bootstrap)
const TOOL_CRAFT_SEQUENCE = {
  wooden_pickaxe: ['oak_planks', 'stick', 'wooden_pickaxe'],
  stone_pickaxe:  ['wooden_pickaxe', 'cobblestone', 'stick', 'stone_pickaxe'],
  wooden_axe:     ['oak_planks', 'stick', 'wooden_axe']
};

/**
 * S'assure que le bot a l'outil requis pour la ressource donnée.
 * Si absent, tente de le crafter.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} resource - Ressource à collecter
 * @returns {boolean}       - Vrai si l'outil est disponible après vérification
 */
async function ensureTool(bot, resource) {
  const req = TOOL_REQUIREMENTS[resource];
  if (!req) return true; // Pas d'outil requis

  if (countItem(bot, req.tool) > 0) return true;

  if (!req.minimum) {
    // Outil recommandé mais non obligatoire
    return true;
  }

  bot.chat(`Il me faut un ${req.tool}. Je vais le crafter.`);
  return await craftItemWithDependencies(bot, req.tool, 1);
}

module.exports = { ensureTool, TOOL_REQUIREMENTS };

/**
 * building.js — Actions de construction bloc par bloc
 *
 * Place des blocs selon un blueprint chargé.
 */

const { goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

/**
 * Place un bloc à une position donnée.
 *
 * @param {Object} bot       - Instance Mineflayer
 * @param {string} blockName - Nom du bloc à poser (ex: "oak_planks")
 * @param {Object} pos       - Position { x, y, z }
 */
async function placeBlock(bot, blockName, pos) {
  const mcData = require('minecraft-data')(bot.version);
  const blockData = mcData.itemsByName[blockName];

  if (!blockData) {
    throw new Error(`Bloc inconnu : ${blockName}`);
  }

  // S'équiper du bloc
  const item = bot.inventory.findInventoryItem(blockData.id, null);
  if (!item) {
    throw new Error(`Pas de ${blockName} dans l'inventaire.`);
  }

  await bot.equip(item, 'hand');

  // Se positionner pour placer le bloc
  await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, 3));

  // Trouver un bloc de référence adjacent pour poser dessus
  const refBlock = bot.blockAt(new Vec3(pos.x, pos.y - 1, pos.z));
  if (!refBlock) {
    throw new Error(`Pas de surface pour poser à ${JSON.stringify(pos)}`);
  }

  await bot.placeBlock(refBlock, new (require('vec3'))(0, 1, 0));
}

/**
 * Construit un blueprint entier.
 * Prend une liste de { blockName, x, y, z } et les place dans l'ordre.
 *
 * @param {Object}   bot    - Instance Mineflayer
 * @param {Array}    blocks - Liste des blocs à poser
 * @param {Function} onProgress - Callback optionnel(step, total)
 */
async function buildBlueprint(bot, blocks, onProgress = null) {
  for (let i = 0; i < blocks.length; i++) {
    const { blockName, x, y, z } = blocks[i];
    await placeBlock(bot, blockName, { x, y, z });

    if (onProgress) onProgress(i + 1, blocks.length);
  }
}

module.exports = { placeBlock, buildBlueprint };

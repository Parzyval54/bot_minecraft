/**
 * mining.js — Actions de minage
 *
 * Le bot vérifie toujours l'outil avant de miner.
 */

const { isProtectedTraversalBlock } = require('./movement');
const { collectNearbyItems } = require('./inventory');

/**
 * Mine un bloc à une position donnée.
 *
 * @param {Object} bot - Instance Mineflayer
 * @param {Object} pos - { x, y, z }
 */
async function mineBlock(bot, pos, options = {}) {
  const block = bot.blockAt(pos);
  if (!block || block.name === 'air') return false;
  if (isProtectedTraversalBlock(block)) {
    bot.chat('Je préserve ' + block.name + ' : ce bloc peut servir de passage.');
    return false;
  }

  // Se positionner près du bloc
  await bot.pathfinder.goto(
    new (require('mineflayer-pathfinder').goals.GoalNear)(pos.x, pos.y, pos.z, 3)
  );

  await bot.dig(block);
  if (options.collectDrops) await collectNearbyItems(bot, { announce: false });
  return true;
}

/**
 * Mine plusieurs blocs d'un type donné dans un rayon.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} blockName - Nom du bloc (ex: "stone", "coal_ore")
 * @param {number} count     - Nombre de blocs à miner
 */
async function mineByName(bot, blockName, count) {
  const mcData = require('minecraft-data')(bot.version);
  const blockType = mcData.blocksByName[blockName];
  if (!blockType) {
    bot.chat(`Bloc inconnu : ${blockName}`);
    return;
  }

  let mined = 0;
  while (mined < count) {
    const block = bot.findBlock({
      matching: blockType.id,
      maxDistance: 64
    });

    if (!block) {
      bot.chat(`Impossible de trouver plus de ${blockName}.`);
      break;
    }

    const didMine = await mineBlock(bot, block.position, { collectDrops: true });
    if (!didMine) break;
    mined++;
  }
}

module.exports = { mineBlock, mineByName };

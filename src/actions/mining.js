/**
 * mining.js — Actions de minage
 *
 * Le bot vérifie toujours l'outil avant de miner.
 */

/**
 * Mine un bloc à une position donnée.
 *
 * @param {Object} bot - Instance Mineflayer
 * @param {Object} pos - { x, y, z }
 */
async function mineBlock(bot, pos) {
  const block = bot.blockAt(pos);
  if (!block || block.name === 'air') return;

  // Se positionner près du bloc
  await bot.pathfinder.goto(
    new (require('mineflayer-pathfinder').goals.GoalNear)(pos.x, pos.y, pos.z, 3)
  );

  await bot.dig(block);
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

    await mineBlock(bot, block.position);
    mined++;
  }
}

module.exports = { mineBlock, mineByName };

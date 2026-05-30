/**
 * collecting.js — Collecte de ressources spécifiques (bois, pierre...)
 */

const { mineByName } = require('./mining');

// Rayon de recherche maximal
const MAX_SEARCH_RADIUS = 64;
const MAX_ATTEMPTS = 3;

/**
 * Coupe des arbres pour obtenir des logs.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} logType  - Ex: "oak_log", "birch_log"
 * @param {number} count    - Nombre de logs à collecter
 */
async function chopTrees(bot, logType, count) {
  const mcData = require('minecraft-data')(bot.version);
  const blockType = mcData.blocksByName[logType];
  if (!blockType) {
    bot.chat(`Type de bois inconnu : ${logType}`);
    return;
  }

  let collected = 0;
  let attempts = 0;

  while (collected < count && attempts < MAX_ATTEMPTS) {
    const log = bot.findBlock({
      matching: blockType.id,
      maxDistance: MAX_SEARCH_RADIUS
    });

    if (!log) {
      bot.chat(`Pas de ${logType} trouvé à portée.`);
      break;
    }

    await bot.pathfinder.goto(
      new (require('mineflayer-pathfinder').goals.GoalNear)(
        log.position.x, log.position.y, log.position.z, 3
      )
    );

    await bot.dig(log);
    collected++;
    attempts = 0;
  }

  if (collected < count) {
    bot.chat(`Seulement ${collected}/${count} ${logType} collecté(s).`);
  }
}

/**
 * Collecte une ressource générique par nom.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} resource - Nom de la ressource
 * @param {number} count    - Quantité souhaitée
 */
async function collectResource(bot, resource, count) {
  if (resource.endsWith('_log')) {
    await chopTrees(bot, resource, count);
  } else {
    await mineByName(bot, resource, count);
  }
}

module.exports = { chopTrees, collectResource };

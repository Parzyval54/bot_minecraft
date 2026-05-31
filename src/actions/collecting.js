/**
 * collecting.js — Collecte de ressources spécifiques (bois, pierre...)
 */

const { mineByName } = require('./mining');
const { getBlockName } = require('../survival/resourceFinder');
const { collectNearbyItems } = require('./inventory');
const { goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

// Rayon de recherche maximal
const MAX_SEARCH_RADIUS = 64;
const MAX_ATTEMPTS = 3;
const TREE_APPROACH_RADIUS = 3;
const TREE_CLIMB_RADIUS = 1;
const TREE_SCAFFOLD_SEARCH_RADIUS = 12;
const MAX_TREE_SCAFFOLD_ATTEMPTS = 8;
const TREE_SCAFFOLD_BLOCKS = ['dirt', 'grass_block', 'coarse_dirt'];

function getRequiredTreeScaffolding(bot, log) {
  return Math.max(1, Math.ceil(log.position.y - bot.entity.position.y - TREE_CLIMB_RADIUS));
}

async function gatherTreeScaffolding(bot, movements, requiredCount) {
  const mcData = require('minecraft-data')(bot.version);
  const matching = TREE_SCAFFOLD_BLOCKS
    .map(name => mcData.blocksByName[name]?.id)
    .filter(Boolean);

  let attempts = 0;
  while (movements.countScaffoldingItems() < requiredCount
    && attempts < MAX_TREE_SCAFFOLD_ATTEMPTS) {
    const supportBlock = bot.findBlock({
      matching,
      maxDistance: TREE_SCAFFOLD_SEARCH_RADIUS
    });
    if (!supportBlock) break;

    await bot.pathfinder.goto(
      new goals.GoalNear(supportBlock.position.x, supportBlock.position.y, supportBlock.position.z, 3)
    );
    await bot.dig(supportBlock);
    attempts++;
    await collectNearbyItems(bot, { announce: false });
  }
}


async function approachTreeLog(bot, log) {
  await bot.pathfinder.goto(
    new goals.GoalNear(log.position.x, log.position.y, log.position.z, TREE_APPROACH_RADIUS)
  );

  if (!bot.canDigBlock || bot.canDigBlock(log)) return;

  const movements = bot.__structureAwareMovements;
  if (!movements) throw new Error('Déplacement vertical indisponible pour atteindre la bûche.');
  const requiredScaffolding = getRequiredTreeScaffolding(bot, log);
  if (movements.countScaffoldingItems() < requiredScaffolding) {
    await gatherTreeScaffolding(bot, movements, requiredScaffolding);
  }
  if (movements.countScaffoldingItems() < requiredScaffolding || !movements.getScaffoldingItem()) {
    throw new Error(
      'Bûche trop haute : il me faut ' + requiredScaffolding + ' bloc(s) de soutien pour monter.'
    );
  }

  const previousTowerSetting = movements.allow1by1towers;
  movements.allow1by1towers = true;
  try {
    await bot.pathfinder.goto(
      new goals.GoalNear(log.position.x, log.position.y, log.position.z, TREE_CLIMB_RADIUS)
    );
  } finally {
    movements.allow1by1towers = previousTowerSetting;
  }

  if (!bot.canDigBlock(log)) {
    throw new Error('Impossible de monter assez haut pour atteindre la bûche.');
  }
}

/**
 * Remonte le tronc d'un arbre depuis un log de base et retourne tous les
 * logs de la colonne (même X/Z) appartenant au même type.
 *
 * @param {Object} bot         - Instance Mineflayer
 * @param {Object} baseLog     - Bloc de départ (log le plus bas trouvé)
 * @param {number} blockTypeId - ID du type de log
 * @returns {Object[]}         - Liste de blocs à miner, bas→haut
 */
function collectTrunkPositions(bot, baseLog, blockTypeId) {
  const { x, z } = baseLog.position;
  const trunk = [];
  let y = baseLog.position.y;
  while (true) {
    const block = bot.blockAt(new Vec3(x, y, z));
    if (!block || block.type !== blockTypeId) break;
    trunk.push(block);
    y++;
  }
  return trunk;
}

/**
 * Coupe entièrement le tronc d'un arbre (tous les logs de la colonne).
 *
 * @param {Object} bot         - Instance Mineflayer
 * @param {Object} baseLog     - Log le plus bas du tronc
 * @param {number} blockTypeId - ID du type de log
 * @returns {number}           - Nombre de logs minés
 */
async function chopWholeTrunk(bot, baseLog, blockTypeId) {
  const trunkLogs = collectTrunkPositions(bot, baseLog, blockTypeId);

  for (const log of trunkLogs) {
    // Re-vérifier que le bloc est toujours là (peut avoir été détruit)
    const current = bot.blockAt(log.position);
    if (!current || current.type !== blockTypeId) continue;
    await approachTreeLog(bot, current);
    await bot.dig(current);
  }

  await collectNearbyItems(bot, { announce: false });
  return trunkLogs.length;
}

/**
 * Coupe des arbres pour obtenir des logs.
 * Mine le tronc entier avant de passer à l'arbre suivant.
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
  let noTreeAttempts = 0;

  while (collected < count && noTreeAttempts < MAX_ATTEMPTS) {
    const log = bot.findBlock({
      matching: blockType.id,
      maxDistance: MAX_SEARCH_RADIUS
    });

    if (!log) {
      bot.chat(`Pas de ${logType} trouvé à portée.`);
      break;
    }

    // Trouver le bas du tronc pour ne pas couper depuis le milieu
    const { x, z } = log.position;
    let baseY = log.position.y;
    while (baseY > 0) {
      const below = bot.blockAt(new Vec3(x, baseY - 1, z));
      if (!below || below.type !== blockType.id) break;
      baseY--;
    }
    const baseLog = bot.blockAt(new Vec3(x, baseY, z)) || log;

    try {
      const mined = await chopWholeTrunk(bot, baseLog, blockType.id);
      if (mined === 0) {
        noTreeAttempts++;
      } else {
        collected += mined;
        noTreeAttempts = 0;
      }
    } catch (err) {
      noTreeAttempts++;
      console.warn('[COLLECTING] Erreur coupe arbre :', err.message);
    }
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
    await mineByName(bot, getBlockName(resource), count);
  }
}

module.exports = {
  approachTreeLog,
  chopTrees,
  collectResource,
  gatherTreeScaffolding,
  getRequiredTreeScaffolding
};

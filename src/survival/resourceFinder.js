/**
 * resourceFinder.js — Localise les ressources dans le monde
 *
 * Pour chaque ressource brute, sait comment la trouver.
 */

const MAX_SEARCH_RADIUS = 64;
const MAX_RESOURCE_ATTEMPTS = 3;

// Mapping : ressource → type de bloc à chercher dans le monde
const RESOURCE_BLOCK_MAP = {
  oak_log:      'oak_log',
  birch_log:    'birch_log',
  spruce_log:   'spruce_log',
  cobblestone:  'stone',
  stone:        'stone',
  coal:         'coal_ore',
  sand:         'sand',
  gravel:       'gravel',
  iron_ore:     'iron_ore',
  wool:         'white_wool'
};

/**
 * Cherche le bloc le plus proche correspondant à une ressource.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} resource - Nom de la ressource (ex: "oak_log")
 * @returns {Object|null}   - Bloc trouvé ou null
 */
function getBlockName(resource) {
  return RESOURCE_BLOCK_MAP[resource] || resource;
}

function findResource(bot, resource) {
  const mcData = require('minecraft-data')(bot.version);
  const blockName = getBlockName(resource);
  const blockType = mcData.blocksByName[blockName];

  if (!blockType) {
    console.warn(`[FINDER] Ressource inconnue : ${resource}`);
    return null;
  }

  const block = bot.findBlock({
    matching: blockType.id,
    maxDistance: MAX_SEARCH_RADIUS
  });

  if (!block) {
    console.warn(`[FINDER] ${resource} non trouvé dans un rayon de ${MAX_SEARCH_RADIUS} blocs.`);
  }

  return block || null;
}

/**
 * Retourne un message d'aide si la ressource n'est pas trouvée.
 *
 * @param {string} resource
 * @returns {string}
 */
function getNotFoundMessage(resource) {
  const messages = {
    coal:    'Pas de charbon trouvé. Je peux fabriquer du charbon de bois si j\'ai du bois et un four.',
    sand:    'Pas de sable trouvé. Cherche un biome désertique ou une plage.',
    iron_ore:'Pas de minerai de fer trouvé. Il faut explorer des grottes.'
  };
  return messages[resource] || `Impossible de trouver ${resource} à portée.`;
}

module.exports = { findResource, getBlockName, getNotFoundMessage, MAX_SEARCH_RADIUS, MAX_RESOURCE_ATTEMPTS };

/**
 * placementHelper.js — Utilitaires de positionnement et nettoyage de zone
 */

const { mineBlock } = require('../actions/mining');
const { isProtectedTraversalBlock } = require('../actions/movement');

/**
 * Nettoie une zone rectangulaire (retire tous les blocs non-air).
 *
 * @param {Object} bot    - Instance Mineflayer
 * @param {Object} origin - Coin bas-gauche { x, y, z }
 * @param {number} width
 * @param {number} depth
 * @param {number} height - Hauteur à dégager
 */
async function clearBuildArea(bot, origin, width = 7, depth = 9, height = 5) {
  const { x: ox, y: oy, z: oz } = origin;

  for (let dy = 1; dy <= height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      for (let dz = 0; dz < depth; dz++) {
        const pos = { x: ox + dx, y: oy + dy, z: oz + dz };
        const block = bot.blockAt(pos);
        if (block && block.name !== 'air' && !isProtectedTraversalBlock(block)) {
          await mineBlock(bot, pos).catch(() => {});
        }
      }
    }
  }
}

/**
 * Retourne la position du sol au niveau du joueur (pour démarrer la construction).
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {{ x, y, z }}
 */
function getGroundPosition(bot) {
  const pos = bot.entity.position.floored();
  return { x: pos.x, y: pos.y - 1, z: pos.z };
}

module.exports = { clearBuildArea, getGroundPosition };

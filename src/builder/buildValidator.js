/**
 * buildValidator.js — Vérifie que la zone de construction est libre et plate
 */

const { Vec3 } = require('vec3');

/**
 * Vérifie si la zone autour de l'origine est assez plate et libre.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {Object} origin   - { x, y, z }
 * @param {number} width    - Largeur de la maison
 * @param {number} depth    - Profondeur de la maison
 * @returns {{ ok: boolean, reason?: string }}
 */
function checkBuildArea(bot, origin, width = 7, depth = 9) {
  const { x: ox, y: oy, z: oz } = origin;
  const MAX_HEIGHT_DIFF = 2; // Tolérance de relief

  let minY = oy, maxY = oy;

  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      const surface = findSurface(bot, ox + dx, oy, oz + dz);
      if (surface === null) continue;
      if (surface < minY) minY = surface;
      if (surface > maxY) maxY = surface;
    }
  }

  if (maxY - minY > MAX_HEIGHT_DIFF) {
    return {
      ok: false,
      reason: `Zone trop irrégulière (diff. de hauteur : ${maxY - minY} blocs). Cherche un endroit plus plat.`
    };
  }

  return { ok: true };
}

/**
 * Retourne la hauteur du sol à une position (x, z) en partant de y.
 */
function findSurface(bot, x, startY, z) {
  for (let y = startY + 5; y >= startY - 5; y--) {
    const block = bot.blockAt(new Vec3(x, y, z));
    if (block && block.name !== 'air' && block.name !== 'water' && block.name !== 'lava') {
      return y;
    }
  }
  return null;
}

module.exports = { checkBuildArea };

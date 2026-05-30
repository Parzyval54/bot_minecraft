/**
 * houseGenerator.js — Génère les positions de blocs pour une maison simple
 *
 * Crée un plan 3D (liste de blocs) à partir des paramètres du blueprint.
 * Maison v1 : rectangulaire, toit plat, murs, sol, porte, torches optionnels.
 */

/**
 * Génère la liste des blocs à placer pour une maison.
 *
 * @param {Object} blueprint - Données du blueprint (dimensions, matériaux...)
 * @param {Object} origin    - Coin de départ { x, y, z }
 * @returns {Array}          - [{ blockName, x, y, z }, ...]
 */
function generate(blueprint, origin) {
  const {
    width = 7,
    depth = 9,
    wall_height = 4,
    materials
  } = blueprint;

  const { wall, floor, roof, door_x, door_z } = materials;

  const blocks = [];
  const ox = origin.x;
  const oy = origin.y;
  const oz = origin.z;

  // Sol
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      blocks.push({ blockName: floor, x: ox + dx, y: oy, z: oz + dz });
    }
  }

  // Murs (4 faces)
  for (let dy = 1; dy <= wall_height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      blocks.push({ blockName: wall, x: ox + dx, y: oy + dy, z: oz });
      blocks.push({ blockName: wall, x: ox + dx, y: oy + dy, z: oz + depth - 1 });
    }
    for (let dz = 1; dz < depth - 1; dz++) {
      blocks.push({ blockName: wall, x: ox,          y: oy + dy, z: oz + dz });
      blocks.push({ blockName: wall, x: ox + width - 1, y: oy + dy, z: oz + dz });
    }
  }

  // Toit plat
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      blocks.push({ blockName: roof, x: ox + dx, y: oy + wall_height + 1, z: oz + dz });
    }
  }

  // Porte (ouvrir 2 blocs dans le mur frontal)
  const doorDx = door_x ?? Math.floor(width / 2);
  const doorDz = door_z ?? 0;
  // Retirer les 2 blocs de mur à l'emplacement de la porte
  // (en pratique, ne pas les ajouter — on filtre)
  return blocks.filter(b => {
    const isDoorPos =
      b.z === oz + doorDz &&
      b.x === ox + doorDx &&
      b.y >= oy + 1 && b.y <= oy + 2;
    return !isDoorPos;
  });
}

module.exports = { generate };

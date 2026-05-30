/**
 * materialCounter.js — Compte les matériaux nécessaires pour un blueprint
 *
 * Analyse la liste de blocs du blueprint et retourne le total par type.
 */

/**
 * Compte les blocs nécessaires dans un blueprint.
 *
 * @param {Object} blueprint - Blueprint chargé (avec champ "materials" ou liste de blocs)
 * @returns {Object}         - { block_name: count }
 */
function count(blueprint) {
  // Si le blueprint définit directement les quantités
  if (blueprint.required_materials) {
    return { ...blueprint.required_materials };
  }

  // Sinon, utiliser le générateur pour obtenir la liste de blocs
  const { generate } = require('./houseGenerator');
  const fakeOrigin = { x: 0, y: 0, z: 0 };
  const blocks = generate(blueprint, fakeOrigin);

  const totals = {};
  for (const block of blocks) {
    totals[block.blockName] = (totals[block.blockName] || 0) + 1;
  }

  return totals;
}

module.exports = { count };

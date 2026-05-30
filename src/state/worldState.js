/**
 * worldState.js — Observe l'environnement autour du bot
 *
 * Fournit un résumé de ce qui est proche : arbres, eau, mobs hostiles, items.
 */

/**
 * Retourne un résumé de l'environnement proche.
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {Object}
 */
function getNearby(bot) {
  const SEARCH_RADIUS = 16;
  const entities = Object.values(bot.entities);

  const hostileMobs = entities.some(
    (e) => e.type === 'mob' && e.kind === 'Hostile mobs' && e.position.distanceTo(bot.entity.position) < SEARCH_RADIUS
  );

  const droppedItems = entities.some(
    (e) => e.type === 'object' && e.objectType === 'Item' && e.position.distanceTo(bot.entity.position) < SEARCH_RADIUS
  );

  // Recherche simple de blocs d'arbre et d'eau autour du bot
  // (Nécessite minecraft-data pour une version complète)
  return {
    trees: false,       // TODO : scanner les blocs de log proches
    water: false,       // TODO : scanner les blocs d'eau proches
    hostile_mobs: hostileMobs,
    dropped_items: droppedItems
  };
}

module.exports = { getNearby };

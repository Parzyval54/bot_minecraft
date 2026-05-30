/**
 * dangerState.js — Évalue le niveau de danger autour du bot
 */

const SAFE_HEALTH = 12;
const SAFE_FOOD = 10;
const DANGER_RADIUS = 10;

/**
 * Évalue si la situation est dangereuse.
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {{ danger: boolean, reasons: string[] }}
 */
function evaluate(bot) {
  const reasons = [];

  if (bot.health < SAFE_HEALTH) {
    reasons.push(`Santé faible : ${bot.health}/20`);
  }

  if (bot.food < SAFE_FOOD) {
    reasons.push(`Faim faible : ${bot.food}/20`);
  }

  const nearbyHostile = Object.values(bot.entities).some(
    (e) =>
      e.type === 'mob' &&
      e.kind === 'Hostile mobs' &&
      e.position.distanceTo(bot.entity.position) < DANGER_RADIUS
  );

  if (nearbyHostile) {
    reasons.push('Mob hostile à proximité.');
  }

  return {
    danger: reasons.length > 0,
    reasons
  };
}

module.exports = { evaluate, SAFE_HEALTH, SAFE_FOOD };

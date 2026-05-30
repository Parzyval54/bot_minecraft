/**
 * safetyManager.js — Vérifie les conditions de sécurité avant une tâche
 *
 * Règles de sécurité de la v1 : prudent avant tout.
 */

const { evaluate } = require('../state/dangerState');
const { eatFood, needsFood } = require('../actions/food');
const { fleeToSafety } = require('../actions/combat');

/**
 * Vérifie si le bot est en sécurité pour démarrer une longue tâche.
 *
 * @param {Object} bot       - Instance Mineflayer
 * @param {string} username  - Joueur de référence (pour fuir vers lui si nécessaire)
 * @returns {{ ok: boolean, reason?: string }}
 */
async function check(bot, username = '') {
  const danger = evaluate(bot);

  // Tenter de manger si faim
  if (needsFood(bot)) {
    await eatFood(bot);
    // Re-vérifier après avoir mangé
    if (bot.food < 6) {
      return { ok: false, reason: 'Faim critique et pas de nourriture disponible.' };
    }
  }

  // Fuir si mob hostile proche
  if (danger.danger && danger.reasons.some(r => r.includes('Mob hostile'))) {
    await fleeToSafety(bot, username);
    return { ok: false, reason: 'Mob hostile à proximité. Tâche suspendue.' };
  }

  // Santé critique
  if (bot.health < 6) {
    return { ok: false, reason: `Santé critique : ${bot.health}/20.` };
  }

  // Nuit : avertir mais ne pas bloquer (laisser le choix)
  if (!bot.time.isDay) {
    bot.chat('Attention : il fait nuit. La tâche continue mais reste prudent.');
  }

  return { ok: true };
}

module.exports = { check };

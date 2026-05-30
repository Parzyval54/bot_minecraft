/**
 * recoveryManager.js — Gère la reprise après un échec
 *
 * Tente de récupérer la situation lorsqu'une étape échoue.
 */

const { eatFood } = require('../actions/food');
const { fleeToSafety } = require('../actions/combat');
const { goToSavedLocation } = require('../actions/movement');

/**
 * Tente de récupérer après l'échec d'une étape.
 *
 * @param {Object} bot       - Instance Mineflayer
 * @param {Object} step      - Étape qui a échoué
 * @param {Error}  error     - Erreur rencontrée
 * @param {string} username  - Joueur de référence
 * @returns {boolean}        - Vrai si la récupération a réussi et qu'on peut réessayer
 */
async function recover(bot, step, error, username = '') {
  console.warn(`[RECOVERY] Tentative de récupération pour "${step.action}" : ${error.message}`);

  // Si faim ou santé : manger et retourner à la base
  if (bot.food < 8 || bot.health < 10) {
    await eatFood(bot);
    await goToSavedLocation(bot, 'base').catch(() => {});
    return false; // Ne pas réessayer automatiquement
  }

  // Si inventaire plein signalé dans l'erreur
  if (error.message.includes('inventaire')) {
    await goToSavedLocation(bot, 'main_chest').catch(() => {});
    bot.chat('Inventaire plein. Dépôt au coffre nécessaire avant de continuer.');
    return false;
  }

  // Pas de récupération connue
  return false;
}

module.exports = { recover };

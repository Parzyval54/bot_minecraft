/**
 * structureBuilder.js — Orchestre la construction complète d'une structure
 *
 * Charge le blueprint, génère les blocs, et les place un par un.
 */

const blueprintLoader = require('./blueprintLoader');
const houseGenerator = require('./houseGenerator');
const buildValidator = require('./buildValidator');
const { buildBlueprint } = require('../actions/building');

/**
 * Construit une structure complète à partir d'un blueprint.
 *
 * @param {Object} bot    - Instance Mineflayer
 * @param {string} name   - Nom du blueprint
 * @param {Object} origin - Coordonnées de départ { x, y, z }
 */
async function build(bot, name, origin) {
  const blueprint = blueprintLoader.load(name);
  if (!blueprint) {
    bot.chat(`Blueprint "${name}" introuvable.`);
    return;
  }

  // Valider la zone
  const { width = 7, depth = 9 } = blueprint;
  const areaCheck = buildValidator.checkBuildArea(bot, origin, width, depth);
  if (!areaCheck.ok) {
    bot.chat(`Zone invalide : ${areaCheck.reason}`);
    return;
  }

  // Générer les blocs
  const blocks = houseGenerator.generate(blueprint, origin);
  bot.chat(`Construction : ${blocks.length} blocs à poser.`);

  // Construire avec feedback toutes les 10 étapes
  await buildBlueprint(bot, blocks, (step, total) => {
    if (step % 10 === 0 || step === total) {
      bot.chat(`Progression : ${step}/${total} blocs posés.`);
    }
  });

  bot.chat('Construction terminée !');
}

module.exports = { build };

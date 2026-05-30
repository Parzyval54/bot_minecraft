/**
 * food.js — Actions liées à la nourriture
 */

/**
 * Mange le premier aliment disponible dans l'inventaire.
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {boolean}  - Vrai si le bot a mangé quelque chose
 */
async function eatFood(bot) {
  const mcData = require('minecraft-data')(bot.version);

  // Liste simplifiée d'aliments
  const foodNames = [
    'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
    'bread', 'apple', 'carrot', 'potato', 'baked_potato',
    'beef', 'porkchop', 'chicken', 'mutton'
  ];

  for (const foodName of foodNames) {
    const foodData = mcData.itemsByName[foodName];
    if (!foodData) continue;

    const item = bot.inventory.findInventoryItem(foodData.id, null);
    if (item) {
      await bot.equip(item, 'hand');
      await bot.consume();
      bot.chat(`J'ai mangé du ${foodName}.`);
      return true;
    }
  }

  bot.chat('Pas de nourriture dans l\'inventaire.');
  return false;
}

/**
 * Vérifie si le bot a besoin de manger.
 *
 * @param {Object} bot - Instance Mineflayer
 * @returns {boolean}
 */
function needsFood(bot) {
  return bot.food < 10;
}

module.exports = { eatFood, needsFood };

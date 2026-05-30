/**
 * crafting.js — Actions de craft
 *
 * Le bot utilise une crafting table si nécessaire.
 */

/**
 * Craft un item si les ingrédients sont disponibles.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} itemName - Nom de l'item à crafter (ex: "oak_planks")
 * @param {number} count    - Quantité souhaitée
 */
async function craftItem(bot, itemName, count = 1) {
  const mcData = require('minecraft-data')(bot.version);
  const item = mcData.itemsByName[itemName];

  if (!item) {
    bot.chat(`Item inconnu : ${itemName}`);
    return false;
  }

  // Chercher une recette possible
  const recipe = bot.recipesFor(item.id, null, 1, null)[0]
    || bot.recipesAll(item.id)?.[0];

  if (!recipe) {
    bot.chat(`Pas de recette trouvée pour ${itemName}.`);
    return false;
  }

  // Vérifier si une crafting table est nécessaire (recette 3x3)
  const needsTable = recipe.requiresTable;

  if (needsTable) {
    const table = bot.findBlock({
      matching: mcData.blocksByName['crafting_table'].id,
      maxDistance: 32
    });

    if (!table) {
      bot.chat('Pas de crafting table à portée. Je vais en poser une.');
      // TODO : poser une crafting table depuis l'inventaire
      return false;
    }

    await bot.pathfinder.goto(
      new (require('mineflayer-pathfinder').goals.GoalNear)(
        table.position.x, table.position.y, table.position.z, 3
      )
    );

    await bot.craft(recipe, count, table);
  } else {
    await bot.craft(recipe, count, null);
  }

  return true;
}

module.exports = { craftItem };

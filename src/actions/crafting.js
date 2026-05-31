/**
 * crafting.js — Actions de craft
 *
 * Le bot utilise une crafting table si nécessaire.
 */

const { countItem } = require('../state/inventoryState');
const { CRAFT_RECIPES } = require('../survival/resourcePlanner');
const { Vec3 } = require('vec3');

const WOOD_PLANK_OPTIONS = [
  ['oak_planks', 'oak_log'],
  ['birch_planks', 'birch_log'],
  ['spruce_planks', 'spruce_log']
];

function resolveCraftIngredient(bot, ingredient) {
  if (ingredient !== 'oak_planks') return ingredient;

  for (const [planks] of WOOD_PLANK_OPTIONS) {
    if (countItem(bot, planks) > 0) return planks;
  }
  for (const [planks, log] of WOOD_PLANK_OPTIONS) {
    if (countItem(bot, log) > 0) return planks;
  }
  return ingredient;
}

async function findOrPlaceCraftingTable(bot, mcData) {
  const tableType = mcData.blocksByName.crafting_table;
  let table = bot.findBlock({ matching: tableType.id, maxDistance: 32 });
  if (table) return table;

  const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id, null);
  if (!tableItem) {
    bot.chat('Pas de crafting table disponible.');
    return null;
  }

  const origin = bot.entity.position.floored();
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of offsets) {
    const targetPos = origin.offset(dx, 0, dz);
    const target = bot.blockAt(targetPos);
    const reference = bot.blockAt(targetPos.offset(0, -1, 0));
    if (!target || target.name !== 'air' || !reference || reference.boundingBox === 'empty') continue;

    await bot.equip(tableItem, 'hand');
    await bot.placeBlock(reference, new Vec3(0, 1, 0));
    table = bot.blockAt(targetPos);
    if (table?.name === 'crafting_table') {
      bot.chat('Crafting table posée.');
      return table;
    }
  }

  bot.chat('Impossible de poser une crafting table à proximité.');
  return null;
}


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

  const missing = Math.max(0, count - countItem(bot, itemName));
  if (missing === 0) return true;

  // Chercher une recette possible
  let recipe = bot.recipesFor(item.id, null, 1, null)[0]
    || bot.recipesAll(item.id)?.[0];

  if (!recipe) {
    bot.chat(`Pas de recette trouvée pour ${itemName}.`);
    return false;
  }

  const craftCount = Math.ceil(missing / (recipe.result?.count || 1));

  // Vérifier si une crafting table est nécessaire (recette 3x3)
  const needsTable = recipe.requiresTable;

  if (needsTable) {
    const table = await findOrPlaceCraftingTable(bot, mcData);
    if (!table) return false;
    recipe = bot.recipesFor(item.id, null, craftCount, table)[0] || recipe;

    await bot.pathfinder.goto(
      new (require('mineflayer-pathfinder').goals.GoalNear)(
        table.position.x, table.position.y, table.position.z, 3
      )
    );

    await bot.craft(recipe, craftCount, table);
  } else {
    await bot.craft(recipe, craftCount, null);
  }

  return true;
}

/**
 * Craft un item connu en préparant d'abord ses ingrédients craftables.
 */
async function craftItemWithDependencies(bot, itemName, count = 1, visiting = new Set()) {
  const missing = Math.max(0, count - countItem(bot, itemName));
  if (missing === 0) return true;
  if (visiting.has(itemName)) return false;

  const recipe = CRAFT_RECIPES[itemName];
  if (!recipe) return craftItem(bot, itemName, count);

  visiting.add(itemName);
  for (const [ingredient, ratio] of Object.entries(recipe)) {
    const resolvedIngredient = resolveCraftIngredient(bot, ingredient);
    const ingredientCount = Math.ceil(missing * ratio);
    if (countItem(bot, resolvedIngredient) >= ingredientCount) continue;

    const ok = await craftItemWithDependencies(bot, resolvedIngredient, ingredientCount, visiting);
    if (!ok) {
      visiting.delete(itemName);
      return false;
    }
  }
  visiting.delete(itemName);

  return craftItem(bot, itemName, count);
}

module.exports = { craftItem, craftItemWithDependencies, findOrPlaceCraftingTable, resolveCraftIngredient };

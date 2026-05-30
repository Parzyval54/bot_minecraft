/**
 * smelting.js — Actions de fusion dans un four
 *
 * Permet de fondre du sable en verre, du fer, etc.
 */

/**
 * Fait fondre un item dans un four proche.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} itemName - Item à fondre (ex: "sand", "raw_iron")
 * @param {number} count    - Quantité à fondre
 * @param {string} fuelName - Carburant à utiliser (ex: "coal", "oak_log")
 */
async function smeltItem(bot, itemName, count, fuelName = 'coal') {
  const mcData = require('minecraft-data')(bot.version);
  const furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName['furnace'].id,
    maxDistance: 32
  });

  if (!furnaceBlock) {
    bot.chat('Pas de four à portée.');
    return false;
  }

  await bot.pathfinder.goto(
    new (require('mineflayer-pathfinder').goals.GoalNear)(
      furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 3
    )
  );

  const furnace = await bot.openFurnace(furnaceBlock);

  const inputItem = bot.inventory.findInventoryItem(
    mcData.itemsByName[itemName]?.id, null
  );
  const fuelItem = bot.inventory.findInventoryItem(
    mcData.itemsByName[fuelName]?.id, null
  );

  if (!inputItem) { bot.chat(`Pas de ${itemName} dans l'inventaire.`); furnace.close(); return false; }
  if (!fuelItem) { bot.chat(`Pas de ${fuelName} pour alimenter le four.`); furnace.close(); return false; }

  await furnace.putInput(inputItem.type, null, count);
  await furnace.putFuel(fuelItem.type, null, Math.ceil(count / 8));

  // Attendre la fin de la fusion (simplifié)
  await new Promise((resolve) => setTimeout(resolve, count * 10000));

  await furnace.takeOutput();
  furnace.close();
  return true;
}

module.exports = { smeltItem };

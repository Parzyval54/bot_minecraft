/**
 * resourcePlanner.js — Calcule les ressources brutes nécessaires
 *
 * Convertit les besoins en blocs finaux en ressources brutes à collecter.
 * Ex : 180 oak_planks → 45 oak_log
 */

// Table de conversion : item_final → { raw_material: quantite_par_item_final }
const CRAFT_RECIPES = {
  oak_planks:    { oak_log: 0.25 },           // 1 log → 4 planks
  birch_planks:  { birch_log: 0.25 },
  spruce_planks: { spruce_log: 0.25 },
  stick:         { oak_planks: 0.5 },         // 2 planks → 4 sticks
  crafting_table:{ oak_planks: 4 },
  wooden_pickaxe:{ oak_planks: 3, stick: 2 },
  stone_pickaxe: { cobblestone: 3, stick: 2 },
  stone_axe:     { cobblestone: 3, stick: 2 },
  torch:         { coal: 0.25, stick: 0.25 }, // 1 coal + 1 stick → 4 torches
  oak_door:      { oak_planks: 2 },           // 6 planks → 3 doors
  furnace:       { cobblestone: 8 },
  glass:         { sand: 1 },                 // cuisson 1:1 (nécessite smelting)
  glass_pane:    { glass: 0.375 }             // 6 glass → 16 glass_pane
};

// Items qui nécessitent un four (smelting)
const NEEDS_SMELTING = new Set(['glass']);

/**
 * Calcule les matériaux bruts nécessaires pour obtenir `count` exemplaires de `item`.
 *
 * @param {string} item  - Item final souhaité (ex: "oak_planks")
 * @param {number} count - Quantité souhaitée
 * @returns {Object}     - { raw_material: quantite_entiere_a_collecter }
 */
function getRawNeeds(item, count) {
  const recipe = CRAFT_RECIPES[item];
  if (!recipe) {
    // Item brut : pas de transformation, à collecter directement
    return { [item]: count };
  }

  const result = {};
  for (const [rawMat, ratio] of Object.entries(recipe)) {
    const needed = Math.ceil(count * ratio);
    // Résoudre récursivement si le matériau lui-même est craftable
    const subNeeds = getRawNeeds(rawMat, needed);
    for (const [mat, qty] of Object.entries(subNeeds)) {
      result[mat] = (result[mat] || 0) + qty;
    }
  }
  return result;
}

/**
 * Indique si un item nécessite du crafting (transformation).
 *
 * @param {string} item
 * @returns {boolean}
 */
function needsCrafting(item) {
  return item in CRAFT_RECIPES;
}

/**
 * Indique si un item nécessite un four.
 *
 * @param {string} item
 * @returns {boolean}
 */
function needsSmelting(item) {
  return NEEDS_SMELTING.has(item);
}

// Alternatives de matériaux
const MATERIAL_ALTERNATIVES = {
  oak_planks:  ['birch_planks', 'spruce_planks', 'cobblestone'],
  coal:        ['charcoal'],
  glass_pane:  ['glass', null],
  oak_door:    ['birch_door', 'spruce_door']
};

/**
 * Retourne les alternatives connues pour un matériau.
 *
 * @param {string} item
 * @returns {string[]}
 */
function getAlternatives(item) {
  return MATERIAL_ALTERNATIVES[item] || [];
}

module.exports = { getRawNeeds, needsCrafting, needsSmelting, getAlternatives, CRAFT_RECIPES };

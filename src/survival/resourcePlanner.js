/**
 * resourcePlanner.js — Calcule les ressources brutes nécessaires
 *
 * Convertit les besoins en blocs finaux en ressources brutes à collecter.
 * Ex : 180 oak_planks → 45 oak_log
 */

// Table de conversion : item_final → { ingredient: quantite_par_item_produit }
const CRAFT_RECIPES = {
  // ── Bois de base ─────────────────────────────────────────────────────────
  oak_planks:           { oak_log: 0.25 },              // 1 log → 4 planks
  birch_planks:         { birch_log: 0.25 },
  spruce_planks:        { spruce_log: 0.25 },
  stick:                { oak_planks: 0.5 },             // 2 planks → 4 sticks

  // ── Établis et stockage ───────────────────────────────────────────────────
  crafting_table:       { oak_planks: 4 },
  chest:                { oak_planks: 8 },
  barrel:               { oak_planks: 6, oak_slab: 2 },
  hopper:               { iron_ingot: 5, chest: 1 },
  trapped_chest:        { chest: 1, tripwire_hook: 1 },

  // ── Portes et trappes ────────────────────────────────────────────────────
  oak_door:             { oak_planks: 2 },               // 6 planks → 3 doors
  birch_door:           { birch_planks: 2 },
  spruce_door:          { spruce_planks: 2 },
  oak_trapdoor:         { oak_planks: 3 },               // 6 planks → 2 trapdoors
  birch_trapdoor:       { birch_planks: 3 },
  spruce_trapdoor:      { spruce_planks: 3 },

  // ── Barrières ────────────────────────────────────────────────────────────
  oak_fence:            { oak_planks: 1.34, stick: 0.67 }, // 4p+2s → 3
  birch_fence:          { birch_planks: 1.34, stick: 0.67 },
  spruce_fence:         { spruce_planks: 1.34, stick: 0.67 },
  oak_fence_gate:       { oak_planks: 2, stick: 4 },
  birch_fence_gate:     { birch_planks: 2, stick: 4 },
  spruce_fence_gate:    { spruce_planks: 2, stick: 4 },

  // ── Dalles et escaliers ───────────────────────────────────────────────────
  oak_slab:             { oak_planks: 0.5 },             // 3 planks → 6 slabs
  stone_slab:           { stone: 0.5 },
  cobblestone_slab:     { cobblestone: 0.5 },
  oak_stairs:           { oak_planks: 1.5 },             // 6 planks → 4 stairs
  stone_stairs:         { stone: 1.5 },
  cobblestone_stairs:   { cobblestone: 1.5 },
  cobblestone_wall:     { cobblestone: 1 },              // 6 → 6
  stone_wall:           { stone: 1 },

  // ── Divers bois ───────────────────────────────────────────────────────────
  ladder:               { stick: 2.34 },                 // 7 sticks → 3 ladders
  oak_sign:             { oak_planks: 2, stick: 0.34 },  // 6p+1s → 3 signs
  birch_sign:           { birch_planks: 2, stick: 0.34 },
  spruce_sign:          { spruce_planks: 2, stick: 0.34 },
  oak_boat:             { oak_planks: 5 },
  birch_boat:           { birch_planks: 5 },
  spruce_boat:          { spruce_planks: 5 },

  // ── Blocs de traitement ───────────────────────────────────────────────────
  furnace:              { cobblestone: 8 },
  glass:                { sand: 1 },                     // cuisson 1:1
  glass_pane:           { glass: 0.375 },                // 6 glass → 16 panes
  glass_bottle:         { glass: 1 },                    // 3 glass → 3 bottles
  coal_block:           { coal: 9 },
  iron_block:           { iron_ingot: 9 },
  gold_block:           { gold_ingot: 9 },
  diamond_block:        { diamond: 9 },

  // ── Lumière ───────────────────────────────────────────────────────────────
  torch:                { coal: 0.25, stick: 0.25 },     // 1 coal + 1 stick → 4
  redstone_lamp:        { redstone: 4, glowstone: 1 },

  // ── Outils en bois ───────────────────────────────────────────────────────
  wooden_pickaxe:       { oak_planks: 3, stick: 2 },
  wooden_axe:           { oak_planks: 3, stick: 2 },
  wooden_shovel:        { oak_planks: 1, stick: 2 },
  wooden_hoe:           { oak_planks: 2, stick: 2 },
  wooden_sword:         { oak_planks: 2, stick: 1 },

  // ── Outils en pierre ─────────────────────────────────────────────────────
  stone_pickaxe:        { cobblestone: 3, stick: 2 },
  stone_axe:            { cobblestone: 3, stick: 2 },
  stone_shovel:         { cobblestone: 1, stick: 2 },
  stone_hoe:            { cobblestone: 2, stick: 2 },
  stone_sword:          { cobblestone: 2, stick: 1 },

  // ── Outils en fer ────────────────────────────────────────────────────────
  iron_pickaxe:         { iron_ingot: 3, stick: 2 },
  iron_axe:             { iron_ingot: 3, stick: 2 },
  iron_shovel:          { iron_ingot: 1, stick: 2 },
  iron_hoe:             { iron_ingot: 2, stick: 2 },
  iron_sword:           { iron_ingot: 2, stick: 1 },

  // ── Outils divers ────────────────────────────────────────────────────────
  shears:               { iron_ingot: 2 },
  flint_and_steel:      { flint: 1, iron_ingot: 1 },
  bucket:               { iron_ingot: 3 },
  fishing_rod:          { stick: 3, string: 2 },
  compass:              { iron_ingot: 4, redstone: 1 },
  empty_map:            { paper: 8, compass: 1 },

  // ── Combat ───────────────────────────────────────────────────────────────
  bow:                  { stick: 3, string: 3 },
  arrow:                { flint: 0.25, stick: 0.25, feather: 0.25 }, // 1+1+1 → 4
  shield:               { oak_planks: 6, iron_ingot: 1 },
  crossbow:             { stick: 3, string: 2, iron_ingot: 1, tripwire_hook: 1 },

  // ── Armure en cuir ───────────────────────────────────────────────────────
  leather_helmet:       { leather: 5 },
  leather_chestplate:   { leather: 8 },
  leather_leggings:     { leather: 7 },
  leather_boots:        { leather: 4 },

  // ── Armure en fer ────────────────────────────────────────────────────────
  iron_helmet:          { iron_ingot: 5 },
  iron_chestplate:      { iron_ingot: 8 },
  iron_leggings:        { iron_ingot: 7 },
  iron_boots:           { iron_ingot: 4 },

  // ── Armure en diamant ────────────────────────────────────────────────────
  diamond_helmet:       { diamond: 5 },
  diamond_chestplate:   { diamond: 8 },
  diamond_leggings:     { diamond: 7 },
  diamond_boots:        { diamond: 4 },

  // ── Nourriture ───────────────────────────────────────────────────────────
  bread:                { wheat: 3 },
  bowl:                 { oak_planks: 0.75 },            // 3 planks → 4 bowls
  mushroom_stew:        { bowl: 1, red_mushroom: 1, brown_mushroom: 1 },
  sugar:                { sugar_cane: 1 },
  paper:                { sugar_cane: 1 },               // 3 canes → 3 paper
  cookie:               { wheat: 0.25, cocoa_beans: 0.125 }, // 2w+1c → 8
  hay_block:            { wheat: 9 },

  // ── Livres et enchantements ──────────────────────────────────────────────
  book:                 { paper: 3, leather: 1 },
  bookshelf:            { oak_planks: 6, book: 3 },
  enchanting_table:     { obsidian: 4, diamond: 2, book: 1 },
  anvil:                { iron_block: 3, iron_ingot: 4 },
  grindstone:           { stick: 2, stone_slab: 1, oak_planks: 2 },
  smithing_table:       { iron_ingot: 2, oak_planks: 4 },
  stonecutter:          { stone: 3, iron_ingot: 1 },
  loom:                 { string: 2, oak_planks: 2 },
  lectern:              { oak_slab: 4, bookshelf: 1 },

  // ── Redstone ─────────────────────────────────────────────────────────────
  lever:                { stick: 1, cobblestone: 1 },
  stone_button:         { stone: 1 },
  oak_button:           { oak_planks: 1 },
  stone_pressure_plate: { stone: 2 },
  oak_pressure_plate:   { oak_planks: 2 },
  redstone_torch:       { redstone: 1, stick: 1 },
  repeater:             { stone: 3, redstone_torch: 2, redstone: 1 },
  comparator:           { stone: 3, redstone_torch: 3, nether_quartz: 1 },
  dispenser:            { cobblestone: 7, bow: 1, redstone: 1 },
  dropper:              { cobblestone: 7, redstone: 1 },
  piston:               { oak_planks: 3, cobblestone: 4, iron_ingot: 1, redstone: 1 },
  sticky_piston:        { piston: 1, slime_ball: 1 },
  observer:             { cobblestone: 6, redstone: 2, nether_quartz: 1 },

  // ── Transport ────────────────────────────────────────────────────────────
  rail:                 { iron_ingot: 0.375, stick: 0.063 }, // 6i+1s → 16
  powered_rail:         { gold_ingot: 1, stick: 0.167, redstone: 0.167 }, // 6g+1s+1r → 6
  detector_rail:        { iron_ingot: 1, stone_pressure_plate: 0.167, redstone: 0.167 },
  minecart:             { iron_ingot: 5 },

  // ── Brassage et Nether ───────────────────────────────────────────────────
  brewing_stand:        { blaze_rod: 1, cobblestone: 3 },
  cauldron:             { iron_ingot: 7 },
  eye_of_ender:         { ender_pearl: 1, blaze_powder: 1 },
  blaze_powder:         { blaze_rod: 0.5 },              // 1 rod → 2 powders

  // ── Explosifs ────────────────────────────────────────────────────────────
  tnt:                  { gunpowder: 5, sand: 4 },
  firework_rocket:      { paper: 0.334, gunpowder: 0.334 } // 1p+1g → 3
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

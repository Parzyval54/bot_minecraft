/**
 * validator.js — Valide le JSON produit par le LLM
 *
 * RÈGLE DE SÉCURITÉ : Seules les actions de la liste blanche sont autorisées.
 * Toute intention inconnue est refusée avant d'atteindre le planner.
 */

const ALLOWED_GOALS = [
  'come_to_player',
  'follow_player',
  'stop',
  'go_to_position',
  'go_to_saved_location',
  'save_location',
  'save_chest_location',
  'check_inventory',
  'deposit_items',
  'withdraw_items',
  'collect_nearby_items',
  'drop_items',
  'check_health',
  'eat_food',
  'find_food',
  'avoid_danger',
  'return_to_base',
  'find_resource',
  'collect_resource',
  'mine_block',
  'chop_tree',
  'dig_block',
  'check_tool',
  'craft_item',
  'craft_tool',
  'smelt_item',
  'check_build_area',
  'clear_build_area',
  'count_required_materials',
  'build_house',
  'build_blueprint',
  'place_block',
  'report_status'
];

const RESOURCE_GOALS = new Set([
  'find_resource',
  'collect_resource',
  'mine_block',
  'chop_tree',
  'dig_block'
]);

const ALLOWED_RESOURCES = new Set([
  'oak_log',
  'birch_log',
  'spruce_log',
  'cobblestone',
  'stone',
  'coal',
  'sand',
  'gravel',
  'iron_ore',
  'wool'
]);

const CRAFT_GOALS = new Set([
  'craft_item',
  'craft_tool'
]);

const ALLOWED_CRAFT_ITEMS = new Set([
  'oak_planks',
  'birch_planks',
  'spruce_planks',
  'stick',
  'crafting_table',
  'wooden_pickaxe',
  'stone_pickaxe',
  'wooden_axe',
  'stone_axe',
  'torch',
  'oak_door',
  'birch_door',
  'spruce_door',
  'furnace',
  'glass',
  'glass_pane'
]);

const ALLOWED_BLUEPRINTS = [
  'starter_house',
  'wood_house',
  'storage_room',
  'animal_pen',
  null
];

/**
 * Valide un objet intention produit par le LLM.
 *
 * @param {Object} goal - Objet JSON à valider
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateGoal(goal) {
  if (!goal || typeof goal !== 'object') {
    return { ok: false, reason: 'L\'objet goal est manquant ou invalide.' };
  }

  if (!goal.goal || typeof goal.goal !== 'string') {
    return { ok: false, reason: 'Le champ "goal" est absent ou n\'est pas une chaîne.' };
  }

  if (!ALLOWED_GOALS.includes(goal.goal)) {
    return { ok: false, reason: `But inconnu : "${goal.goal}". Action refusée.` };
  }

  if (RESOURCE_GOALS.has(goal.goal) && !ALLOWED_RESOURCES.has(goal.resource)) {
    return { ok: false, reason: 'Ressource inconnue ou absente : "' + goal.resource + '".' };
  }

  if (CRAFT_GOALS.has(goal.goal) && !ALLOWED_CRAFT_ITEMS.has(goal.item)) {
    return { ok: false, reason: "Item à fabriquer inconnu ou absent : " + goal.item + "." };
  }

  if (goal.count !== undefined && (!Number.isInteger(goal.count) || goal.count < 1 || goal.count > 4096)) {
    return { ok: false, reason: 'Quantité invalide : "' + goal.count + '".' };
  }

  if (goal.blueprint !== undefined && !ALLOWED_BLUEPRINTS.includes(goal.blueprint)) {
    return { ok: false, reason: `Blueprint inconnu : "${goal.blueprint}". Action refusée.` };
  }

  // Interdire tout champ contenant du code (sécurité supplémentaire)
  const raw = JSON.stringify(goal);
  const forbidden = ['eval', 'Function', 'require', 'import', 'exec', '__proto__'];
  for (const word of forbidden) {
    if (raw.includes(word)) {
      return { ok: false, reason: `Contenu suspect détecté dans le plan ("${word}"). Refusé.` };
    }
  }

  return { ok: true };
}

function validate(plan) {
  if (!Array.isArray(plan?.goals)) return validateGoal(plan);
  if (plan.goals.length < 1 || plan.goals.length > 12) {
    return { ok: false, reason: 'Le plan doit contenir entre 1 et 12 actions.' };
  }

  for (let index = 0; index < plan.goals.length; index++) {
    const result = validateGoal(plan.goals[index]);
    if (!result.ok) return { ok: false, reason: "Action " + (index + 1) + " : " + result.reason };
  }
  return { ok: true };
}

module.exports = { validate };

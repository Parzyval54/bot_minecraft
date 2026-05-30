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
function validate(goal) {
  if (!goal || typeof goal !== 'object') {
    return { ok: false, reason: 'L\'objet goal est manquant ou invalide.' };
  }

  if (!goal.goal || typeof goal.goal !== 'string') {
    return { ok: false, reason: 'Le champ "goal" est absent ou n\'est pas une chaîne.' };
  }

  if (!ALLOWED_GOALS.includes(goal.goal)) {
    return { ok: false, reason: `But inconnu : "${goal.goal}". Action refusée.` };
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

module.exports = { validate };

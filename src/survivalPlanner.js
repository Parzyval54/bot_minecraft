/**
 * survivalPlanner.js — Cœur du planificateur de survie
 *
 * Reçoit un objectif validé et le décompose en étapes exécutables.
 * Coordonne les modules survival/, builder/ et actions/.
 */

const taskQueue = require('./taskQueue');
const resourcePlanner = require('./survival/resourcePlanner');
const safetyManager = require('./survival/safetyManager');
const blueprintLoader = require('./builder/blueprintLoader');
const materialCounter = require('./builder/materialCounter');
const inventoryState = require('./state/inventoryState');

/**
 * Planifie et lance l'exécution d'un objectif.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {Object} goal - Objectif validé (ex: { goal: "build_house", blueprint: "starter_house", ... })
 */
async function plan(bot, goal, username = '') {
  console.log('[PLANNER] Planification de :', goal.goals?.map(item => item.goal) || goal.goal);

  // 1. Vérification de sécurité avant toute longue tâche
  const safe = await safetyManager.check(bot);
  if (!safe.ok) {
    bot.chat(`Je ne peux pas commencer : ${safe.reason}`);
    return;
  }

  // 2. Générer les étapes de chaque objectif dans l'ordre demandé
  const goals = Array.isArray(goal.goals) ? goal.goals : [goal];
  const steps = [];
  for (const childGoal of goals) {
    steps.push(...await getStepsForGoal(bot, childGoal, username));
  }

  if (steps.length === 0) {
    bot.chat('Aucune étape à exécuter pour cet objectif.');
    return;
  }

  // 3. Enregistrer la tâche dans la file
  const task = taskQueue.create(goal, steps);
  bot.chat(`Plan créé : ${steps.length} étape(s). Je commence.`);

  // 4. Exécuter les étapes
  await taskQueue.run(bot, task);
}

async function getStepsForGoal(bot, goal, username = '') {
  switch (goal.goal) {
    case 'build_house':
    case 'build_blueprint':
      return planBuildHouse(bot, goal);

    case 'find_resource':
    case 'collect_resource':
    case 'mine_block':
    case 'chop_tree':
      return [
        { action: 'find_resource', resource: goal.resource },
        { action: 'collect_resource', resource: goal.resource, count: goal.count || 1 }
      ];

    case 'craft_item':
    case 'craft_tool':
      return [{ action: goal.goal, item: goal.item, count: goal.count || 1 }];

    case 'come_to_player':
      return [{ action: 'come_to_player', username }];

    case 'check_inventory':
      return [{ action: 'check_inventory' }];

    case 'return_to_base':
      return [{ action: 'go_to_saved_location', name: 'base' }];

    case 'deposit_items':
      return [
        { action: 'go_to_saved_location', name: 'main_chest' },
        { action: 'deposit_items' }
      ];

    case 'follow_player':
      return [{ action: 'follow_player', username }];

    case 'drop_items':
      return [{ action: 'drop_items', item: goal.item, count: goal.count }];

    default:
      return [{ action: goal.goal }];
  }
}

/**
 * Génère les étapes pour construire une maison en survie.
 */
async function planBuildHouse(bot, goal) {
  const blueprintName = goal.blueprint || 'starter_house';

  // Charger le blueprint
  const blueprint = blueprintLoader.load(blueprintName);
  if (!blueprint) {
    return [];
  }

  // Compter les matériaux nécessaires
  const required = materialCounter.count(blueprint);
  const missing = inventoryState.getMissingItems(bot, required);

  const steps = [
    { action: 'save_build_origin' },
    { action: 'load_blueprint', name: blueprintName },
    { action: 'check_build_area' }
  ];

  // Ajouter des étapes de collecte si des ressources manquent
  for (const [item, count] of Object.entries(missing)) {
    const rawNeeded = resourcePlanner.getRawNeeds(item, count);
    for (const [rawItem, rawCount] of Object.entries(rawNeeded)) {
      steps.push({ action: 'find_resource', resource: rawItem });
      steps.push({ action: 'collect_resource', resource: rawItem, count: rawCount });
    }
    if (resourcePlanner.needsCrafting(item)) {
      steps.push({ action: 'craft_item', item, count });
    }
  }

  steps.push(
    { action: 'return_to_build_origin' },
    { action: 'clear_build_area' },
    { action: 'build_blueprint', name: blueprintName },
    { action: 'report_result' }
  );

  return steps;
}

module.exports = { getStepsForGoal, plan };

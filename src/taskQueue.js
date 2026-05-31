/**
 * taskQueue.js — File de tâches persistante
 *
 * Permet de reprendre une tâche après une interruption.
 * Chaque tâche est identifiée, sauvegardée et exécutée étape par étape.
 */

const fs = require('fs');
const path = require('path');
const collecting = require('./actions/collecting');
const resourceFinder = require('./survival/resourceFinder');
const { craftItemWithDependencies } = require('./actions/crafting');
const inventory = require('./actions/inventory');
const movement = require('./actions/movement');

const QUEUE_FILE = path.join(__dirname, '..', 'logs', 'tasks.log');

let currentTask = null;
const pendingTasks = [];

/**
 * Crée une nouvelle tâche.
 *
 * @param {Object}   goal  - Objectif validé
 * @param {Array}    steps - Liste des étapes
 * @returns {Object}       - Tâche créée
 */
function create(goal, steps) {
  const task = {
    id: `task_${Date.now()}`,
    goal: goal.goal || 'multi_goal',
    goals: goal.goals || [goal],
    blueprint: goal.blueprint || null,
    status: 'pending',
    current_step: 0,
    steps,
    origin: null,
    remaining_materials: {}
  };

  saveLog(task);
  return task;
}

/**
 * Exécute les étapes d'une tâche une par une.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {Object} task - Tâche à exécuter
 */
async function run(bot, task) {
  if (currentTask && currentTask !== task) {
    task.status = 'queued';
    pendingTasks.push(task);
    saveLog(task);
    bot.chat('Tâche ajoutée à la file.');
    return;
  }

  currentTask = task;
  task.status = 'running';

  for (let i = task.current_step; i < task.steps.length; i++) {
    task.current_step = i;
    const step = task.steps[i];

    console.log(`[QUEUE] Étape ${i + 1}/${task.steps.length} : ${step.action}`);
    bot.chat(`Étape ${i + 1} : ${step.action.replace(/_/g, ' ')}`);

    try {
      await executeStep(bot, step);
    } catch (err) {
      task.status = 'failed';
      currentTask = null;
      console.error(`[QUEUE] Échec à l'étape ${i + 1} :`, err.message);
      bot.chat(`Erreur à l'étape "${step.action}" : ${err.message}. Tâche suspendue.`);
      saveLog(task);

      const nextTask = pendingTasks.shift();
      if (nextTask) {
        bot.chat('Je passe à la tâche suivante.');
        await run(bot, nextTask);
      }
      return;
    }
  }

  task.status = 'completed';
  bot.chat('Tâche terminée.');
  saveLog(task);
  currentTask = null;

  const nextTask = pendingTasks.shift();
  if (nextTask) {
    bot.chat('Je passe à la tâche suivante.');
    await run(bot, nextTask);
  }
}

/**
 * Reprend la tâche en cours si elle existe.
 *
 * @param {Object} bot - Instance Mineflayer
 */
async function resume(bot) {
  if (!currentTask) {
    bot.chat('Aucune tâche à reprendre.');
    return;
  }
  if (currentTask.status === 'running') {
    bot.chat('La tâche est déjà en cours.');
    return;
  }
  if (currentTask.status === 'completed') {
    bot.chat('La dernière tâche est déjà terminée.');
    return;
  }
  bot.chat(`Reprise de la tâche à l'étape ${currentTask.current_step + 1}.`);
  await run(bot, currentTask);
}

/**
 * Annule la tâche en cours.
 */
async function cancel(bot) {
  if (currentTask) {
    currentTask.status = 'cancelled';
    saveLog(currentTask);
    currentTask = null;
  }

  const nextTask = pendingTasks.shift();
  if (bot && nextTask) await run(bot, nextTask);
}

/**
 * Exécute une étape individuelle.
 * À compléter progressivement avec chaque action.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {Object} step - Étape à exécuter
 */
async function executeStep(bot, step) {
  switch (step.action) {
    case 'come_to_player':
      await movement.comeToPlayer(bot, step.username || '');
      return;
    case 'follow_player':
      await movement.followPlayer(bot, step.username || '');
      bot.chat('Je te suis.');
      return;
    case 'find_resource': {
      const block = resourceFinder.findResource(bot, step.resource);
      if (!block) throw new Error(resourceFinder.getNotFoundMessage(step.resource));
      bot.chat(step.resource + ' trouvé à proximité.');
      return;
    }
    case 'collect_resource':
      await collecting.collectResource(bot, step.resource, step.count || 1);
      return;
    case 'collect_nearby_items':
      await inventory.collectNearbyItems(bot);
      return;
    case 'check_inventory': {
      const items = bot.inventory.items();
      if (items.length === 0) {
        bot.chat('Mon inventaire est vide.');
      } else {
        const summary = items
          .map(i => `${i.name} x${i.count}`)
          .join(', ');
        bot.chat(`Inventaire : ${summary}`);
      }
      return;
    }
    case 'drop_items':
      if (step.username) {
        await movement.comeToPlayer(bot, step.username);
      }
      await inventory.dropItems(bot, step.item, step.count);
      return;
    case 'craft_item':
    case 'craft_tool': {
      if (!step.item) throw new Error('Item à fabriquer absent.');
      const crafted = await craftItemWithDependencies(bot, step.item, step.count || 1);
      if (!crafted) throw new Error('Impossible de fabriquer ' + step.item + '.');
      return;
    }
    default:
      throw new Error('Action non implémentée : ' + step.action);
  }
}

/**
 * Sauvegarde la tâche dans le log.
 */
function saveLog(task) {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  const line = JSON.stringify({ ...task, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(QUEUE_FILE, line, 'utf8');
}

function getCurrent() {
  return currentTask;
}

module.exports = { create, run, resume, cancel, executeStep, getCurrent };

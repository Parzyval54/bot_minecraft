/**
 * taskQueue.js — File de tâches persistante
 *
 * Permet de reprendre une tâche après une interruption.
 * Chaque tâche est identifiée, sauvegardée et exécutée étape par étape.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, '..', 'logs', 'tasks.log');

let currentTask = null;

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
    goal: goal.goal,
    blueprint: goal.blueprint || null,
    status: 'pending',
    current_step: 0,
    steps,
    origin: null,
    remaining_materials: {}
  };

  currentTask = task;
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
      console.error(`[QUEUE] Échec à l'étape ${i + 1} :`, err.message);
      bot.chat(`Erreur à l'étape "${step.action}" : ${err.message}. Tâche suspendue.`);
      saveLog(task);
      return;
    }
  }

  task.status = 'completed';
  bot.chat('Tâche terminée.');
  saveLog(task);
  currentTask = null;
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
function cancel() {
  if (currentTask) {
    currentTask.status = 'cancelled';
    saveLog(currentTask);
    currentTask = null;
  }
}

/**
 * Exécute une étape individuelle.
 * À compléter progressivement avec chaque action.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {Object} step - Étape à exécuter
 */
async function executeStep(bot, step) {
  // Les actions seront importées depuis src/actions/
  // Pour l'instant, les étapes inconnues sont ignorées avec un avertissement.
  console.warn(`[QUEUE] Action non implémentée : ${step.action}`);
}

/**
 * Sauvegarde la tâche dans le log.
 */
function saveLog(task) {
  const line = JSON.stringify({ ...task, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(QUEUE_FILE, line, 'utf8');
}

function getCurrent() {
  return currentTask;
}

module.exports = { create, run, resume, cancel, getCurrent };

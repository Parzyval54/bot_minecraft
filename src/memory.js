/**
 * memory.js — Gestion de la mémoire persistante du bot
 *
 * Lit et écrit dans memory.json.
 * Permet de sauvegarder : base, coffre principal, positions nommées.
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', 'memory.json');

/**
 * Charge la mémoire depuis le fichier.
 * @returns {Object}
 */
function load() {
  try {
    const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { base: null, main_chest: null, saved_locations: {} };
  }
}

/**
 * Sauvegarde la mémoire dans le fichier.
 * @param {Object} data
 */
function save(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Lit une valeur dans la mémoire.
 * @param {string} key
 * @returns {*}
 */
function get(key) {
  const data = load();
  return data[key] ?? null;
}

/**
 * Écrit une valeur dans la mémoire.
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
  const data = load();
  data[key] = value;
  save(data);
}

/**
 * Retourne toute la mémoire.
 * @returns {Object}
 */
function getAll() {
  return load();
}

module.exports = { get, set, getAll };

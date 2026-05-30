/**
 * blueprintLoader.js — Charge un blueprint depuis le dossier blueprints/
 */

const fs = require('fs');
const path = require('path');

const BLUEPRINTS_DIR = path.join(__dirname, '..', 'blueprints');

/**
 * Charge un blueprint par son nom.
 *
 * @param {string} name - Nom du blueprint (ex: "starter_house")
 * @returns {Object|null}
 */
function load(name) {
  const filePath = path.join(BLUEPRINTS_DIR, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`[BLUEPRINT] Fichier introuvable : ${filePath}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[BLUEPRINT] Erreur de lecture du blueprint "${name}" :`, err.message);
    return null;
  }
}

/**
 * Liste les blueprints disponibles.
 * @returns {string[]}
 */
function listAvailable() {
  return fs.readdirSync(BLUEPRINTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

module.exports = { load, listAvailable };

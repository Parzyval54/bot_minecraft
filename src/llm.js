/**
 * llm.js — Interface avec Ollama (LLM local)
 *
 * RÈGLE DE SÉCURITÉ : Le LLM ne produit que du JSON structuré.
 * Jamais de code JavaScript à exécuter. Jamais d'eval().
 */

const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://100.118.132.19:11434/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';

let resolvedModelPromise = null;
let lastLLMError = null;

function getLastLLMError() {
  return lastLLMError;
}

async function resolveModel() {
  if (!resolvedModelPromise) {
    const tagsUrl = new URL('/api/tags', OLLAMA_URL).toString();
    resolvedModelPromise = axios.get(tagsUrl)
      .then((response) => {
        const models = response.data.models?.map(model => model.name) || [];
        if (models.includes(OLLAMA_MODEL)) return OLLAMA_MODEL;

        const fallback = models.find(name => name.startsWith('qwen2.5-coder:')) || models[0];
        if (!fallback) throw new Error('Aucun modèle Ollama installé.');

        console.warn('[LLM] Modèle "' + OLLAMA_MODEL + '" indisponible. Utilisation de "' + fallback + '".');
        return fallback;
      })
      .catch((err) => {
        console.warn('[LLM] Impossible de lister les modèles Ollama : ' + err.message);
        return OLLAMA_MODEL;
      });
  }

  return resolvedModelPromise;
}

const ITEM_ALIASES = {
  etabli: 'crafting_table',
  'table de craft': 'crafting_table',
  crafting_table: 'crafting_table',
  'hache en bois': 'wooden_axe',
  hache: 'wooden_axe',
  wooden_axe: 'wooden_axe',
  'pioche en bois': 'wooden_pickaxe',
  wooden_pickaxe: 'wooden_pickaxe',
  'pioche en pierre': 'stone_pickaxe',
  stone_pickaxe: 'stone_pickaxe'
};

const RESOURCE_GOAL_NAMES = new Set([
  'find_resource',
  'collect_resource',
  'mine_block',
  'chop_tree',
  'dig_block'
]);

const RESOURCE_ALIASES = {
  bois: 'oak_log',
  wood: 'oak_log',
  log: 'oak_log',
  logs: 'oak_log',
  chene: 'oak_log',
  oak: 'oak_log',
  bouleau: 'birch_log',
  birch: 'birch_log',
  sapin: 'spruce_log',
  spruce: 'spruce_log',
  pierre: 'stone',
  stone: 'stone',
  cobblestone: 'cobblestone',
  charbon: 'coal',
  coal: 'coal',
  sable: 'sand',
  sand: 'sand',
  gravier: 'gravel',
  gravel: 'gravel',
  fer: 'iron_ore',
  iron: 'iron_ore',
  laine: 'wool',
  wool: 'wool'
};

function simplifyText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferCount(instruction, fallback = 1) {
  const text = simplifyText(instruction);
  const stackMatch = text.match(/(?:(\d+|un|une|deux|trois|quatre)\s+)?(?:stack|stacks|pile|piles)/);
  if (stackMatch) {
    const writtenNumbers = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4 };
    return Number(writtenNumbers[stackMatch[1]] || stackMatch[1] || 1) * 64;
  }

  const numberMatch = text.match(/\b(\d+)\b/);
  if (numberMatch) return Number(numberMatch[1]);

  const numericFallback = Number(fallback);
  return Number.isFinite(numericFallback) && numericFallback > 0 ? Math.ceil(numericFallback) : 1;
}

function normalizeResource(resource, instruction) {
  const candidates = [resource, instruction].map(simplifyText);
  for (const candidate of candidates) {
    const aliases = Object.entries(RESOURCE_ALIASES).sort(([a], [b]) => b.length - a.length);
    for (const [alias, canonical] of aliases) {
      if (candidate === alias || candidate.includes(alias)) return canonical;
    }
  }
  return resource ? simplifyText(resource).replace(/\s+/g, '_') : undefined;
}

function normalizeItem(item) {
  const normalized = simplifyText(item);
  const aliases = Object.entries(ITEM_ALIASES).sort(([a], [b]) => b.length - a.length);
  for (const [alias, canonical] of aliases) {
    if (normalized === alias || normalized.includes(alias)) return canonical;
  }
  return normalized ? normalized.replace(/\s+/g, '_') : undefined;
}

function isDeliveryInstruction(instruction) {
  return /\b(donne(?:-moi)?|donne moi|file(?:-moi| moi)?|apporte(?:-moi| moi)?|passe(?:-moi| moi)?|remets(?:-moi| moi)?|fournis(?:-moi| moi)?|lache(?:-moi| moi)?|drop|give me|bring me|hand me)\b/i.test(simplifyText(instruction));
}

function normalizeGoal(goal, instruction, options = {}) {
  if (!goal || typeof goal !== 'object') return goal;

  const normalized = { ...goal };
  if (typeof normalized.goal === 'string') {
    normalized.goal = simplifyText(normalized.goal).replace(/[-\s]+/g, '_');
  }
  if (normalized.resource || RESOURCE_GOAL_NAMES.has(normalized.goal)) {
    normalized.resource = normalizeResource(normalized.resource, instruction);
  }
  if (normalized.item) normalized.item = normalizeItem(normalized.item);
  if (normalized.count !== undefined) {
    normalized.count = options.preferInstructionCount
      ? inferCount(instruction, normalized.count)
      : inferCount("", normalized.count);
  } else if (options.preferInstructionCount && /\d|stack|pile/i.test(instruction)) {
    normalized.count = inferCount(instruction);
  }

  if (normalized.goal === 'drop_items' && !/\d|stack|pile/i.test(instruction)) {
    normalized.count = undefined;
  }
  return normalized;
}

function normalizePlan(plan, instruction) {
  const rawGoals = Array.isArray(plan?.goals) ? plan.goals : [plan];
  const preferInstructionCount = rawGoals.length === 1;
  const goals = rawGoals.map(goal => normalizeGoal(goal, instruction, { preferInstructionCount }));

  if (isDeliveryInstruction(instruction) && !goals.some(goal => goal.goal === 'drop_items')) {
    const sourceGoal = [...goals].reverse().find(goal => goal.item || goal.resource);
    if (sourceGoal) {
      goals.push({
        goal: 'drop_items',
        item: sourceGoal.item || sourceGoal.resource,
        count: sourceGoal.count,
        delivery: true
      });
    }
  }

  return { goals };
}

/**
 * Envoie un état résumé + une instruction au LLM.
 * Retourne un objet JSON validé (intention structurée).
 *
 * @param {string} instruction - Commande du joueur (ex: "construis une petite maison ici")
 * @param {Object} botState    - État résumé du bot (position, santé, inventaire, mémoire...)
 * @returns {Object|null}      - L'objet JSON produit par le LLM, ou null en cas d'erreur
 */
async function askLLM(instruction, botState) {
  lastLLMError = null;
  const model = await resolveModel();
  const systemPrompt = `
Tu es un planificateur pour un agent Minecraft en mode survie.
Tu reçois une instruction en langage naturel et l'état actuel du bot.
Tu dois répondre UNIQUEMENT avec un objet JSON valide représentant l'intention structurée.
N'écris jamais de code JavaScript. Ne génère jamais de liste de blocs.
Produis seulement des intentions de haut niveau.
Si la demande contient plusieurs actions, ajoute un objet par action dans "goals", dans l'ordre demandé. Ne fusionne pas les actions indépendantes.
Une tâche déjà lancée reste active et les nouvelles actions seront ajoutées à la file. Si la phrase demande aussi de reprendre la commande précédente, ne crée pas de but supplémentaire pour cette reprise.

Format attendu :
{
  "goals": [
    {
      "goal": "nom_du_but",
  "resource": "nom_de_la_ressource | null",
  "item": "nom_de_l_item | null",
  "count": 1,
  "location": "player_position | saved_location | coordinates",
  "blueprint": "nom_du_blueprint | null",
      "constraints": {
        "mode": "survival",
        "allow_resource_gathering": true,
        "allow_crafting": true
      }
    }
  ]
}

Buts autorisés :
- Déplacements : come_to_player, follow_player, stop, go_to_position,
  go_to_saved_location, return_to_base, save_location, save_chest_location.
- Inventaire et état : check_inventory, deposit_items, withdraw_items,
  collect_nearby_items, drop_items, check_health, report_status.
- Survie : eat_food, find_food, avoid_danger.
- Ressources : find_resource, collect_resource, mine_block, chop_tree, dig_block,
  check_tool.
- Fabrication : craft_item, craft_tool, smelt_item.
- Construction : check_build_area, clear_build_area, count_required_materials,
  build_house, build_blueprint, place_block.

Ressources connues :
oak_log, birch_log, spruce_log, cobblestone, stone, coal, iron_ore, gold_ore,
diamond, redstone, obsidian, sand, gravel, wool, wheat, sugar_cane.

Items fabricables connus (par catégorie) :
- Bois : oak_planks, birch_planks, spruce_planks, stick
- Stockage : crafting_table, chest, trapped_chest, barrel, hopper
- Blocs : furnace, glass, glass_pane, glass_bottle, coal_block, iron_block, gold_block, diamond_block, torch, redstone_lamp
- Portes/trappes : oak_door, birch_door, spruce_door, oak_trapdoor, birch_trapdoor, spruce_trapdoor
- Barrières : oak_fence, birch_fence, spruce_fence, oak_fence_gate, birch_fence_gate, spruce_fence_gate
- Dalles : oak_slab, stone_slab, cobblestone_slab
- Escaliers : oak_stairs, stone_stairs, cobblestone_stairs
- Murs/divers : cobblestone_wall, stone_wall, ladder, oak_sign, birch_sign, spruce_sign
- Transport : oak_boat, birch_boat, spruce_boat, minecart, rail, powered_rail, detector_rail
- Outils bois : wooden_pickaxe, wooden_axe, wooden_shovel, wooden_hoe, wooden_sword
- Outils pierre : stone_pickaxe, stone_axe, stone_shovel, stone_hoe, stone_sword
- Outils fer : iron_pickaxe, iron_axe, iron_shovel, iron_hoe, iron_sword
- Outils divers : shears, flint_and_steel, bucket, fishing_rod, bow, arrow, shield, crossbow, compass, empty_map
- Armure cuir : leather_helmet, leather_chestplate, leather_leggings, leather_boots
- Armure fer : iron_helmet, iron_chestplate, iron_leggings, iron_boots
- Armure diamant : diamond_helmet, diamond_chestplate, diamond_leggings, diamond_boots
- Nourriture : bread, bowl, mushroom_stew, sugar, paper, cookie, hay_block
- Livres/enchantements : book, bookshelf, enchanting_table, anvil, grindstone, smithing_table, stonecutter, loom, lectern
- Redstone : lever, stone_button, oak_button, stone_pressure_plate, oak_pressure_plate, redstone_torch, repeater, comparator, dispenser, dropper, piston, sticky_piston, observer
- Brassage : brewing_stand, cauldron, eye_of_ender, blaze_powder
- Explosifs : tnt, firework_rocket

Blueprints autorisés :
starter_house, wood_house, storage_room, animal_pen.

Exemples de traduction :
- "coupe 10 blocs de bois de chêne" -> {"goals":[{"goal":"chop_tree","resource":"oak_log","count":10}]}
- "va chercher un stack de bois" -> {"goals":[{"goal":"collect_resource","resource":"oak_log","count":64}]}
- "va chercher 20 blocs de sable" -> {"goals":[{"goal":"collect_resource","resource":"sand","count":20}]}
- "mine 8 blocs de pierre" -> {"goals":[{"goal":"mine_block","resource":"stone","count":8}]}
- "retourne à la base" -> {"goals":[{"goal":"return_to_base"}]}
- "construis une petite maison" -> {"goals":[{"goal":"build_house","blueprint":"starter_house"}]}
- "avec le bois fais un établi et une hache" -> {"goals":[{"goal":"craft_item","item":"crafting_table","count":1},{"goal":"craft_tool","item":"wooden_axe","count":1}]}
- "donne moi du bois" -> {"goals":[{"goal":"collect_resource","resource":"oak_log","count":1},{"goal":"drop_items","item":"oak_log","count":1}]}
- "file-moi du bois" -> {"goals":[{"goal":"collect_resource","resource":"oak_log","count":1},{"goal":"drop_items","item":"oak_log","count":1}]}
- "drop une porte de ton inventaire" -> {"goals":[{"goal":"drop_items","item":"oak_door"}]}
- "jette 5 torches" -> {"goals":[{"goal":"drop_items","item":"torch","count":5}]}

Note : drop_items jette des items directement depuis l'inventaire actuel du bot, sans passer par un coffre. Si aucune quantité n'est précisée, on dépose tous les items de ce type.

Pour les demandes du type "donne moi", "file moi" ou "apporte moi", produis la collecte ou le craft puis ajoute ensuite "drop_items" avec le même item afin de remettre l'objet au joueur.
`;

  const userMessage = `
Instruction : "${instruction}"
État du bot :
${JSON.stringify(botState, null, 2)}
`;

  try {
    const response = await axios.post(OLLAMA_URL, {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.1 }
    });

    const raw = response.data.message.content.trim();

    // Extraire uniquement le bloc JSON (sécurité : ignorer tout texte autour)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      lastLLMError = 'Réponse Ollama non JSON.';
      console.error('[LLM] Réponse non JSON :', raw);
      return null;
    }

    return normalizePlan(JSON.parse(jsonMatch[0]), instruction);
  } catch (err) {
    lastLLMError = err.response?.data?.error || err.message;
    console.error("[LLM] Erreur lors de l'appel :", lastLLMError);
    return null;
  }
}

module.exports = { askLLM, getLastLLMError, resolveModel, inferCount, normalizeGoal, normalizeItem, normalizePlan, normalizeResource, simplifyText };

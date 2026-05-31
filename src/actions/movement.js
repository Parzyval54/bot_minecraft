/**
 * movement.js — Actions de déplacement
 *
 * Utilise mineflayer-pathfinder pour naviguer vers une cible.
 */

const { goals, Movements } = require('mineflayer-pathfinder');
const memory = require('../memory');

const DOOR_OPEN_COOLDOWN_MS = 1500;

const PROTECTED_TRAVERSAL_SUFFIXES = [
  '_door',
  '_trapdoor',
  '_fence_gate',
  '_stairs'
];

const PROTECTED_TRAVERSAL_NAMES = new Set([
  'door',
  'trap_door',
  'fence_gate',
  'ladder',
  'scaffolding'
]);

function isProtectedTraversalBlock(block) {
  if (!block?.name) return false;
  return PROTECTED_TRAVERSAL_NAMES.has(block.name)
    || PROTECTED_TRAVERSAL_SUFFIXES.some(suffix => block.name.endsWith(suffix));
}

function canOpenByHand(block) {
  if (!block?.name || block.name.startsWith('iron_')
    || block.name === 'trap_door' || block.name.includes('trapdoor')) return false;
  return block.name === 'door' || block.name === 'fence_gate'
    || block.name.endsWith('_door') || block.name.endsWith('_fence_gate');
}

function getToolEnchantments(tool) {
  if (!tool) return [];
  try {
    const enchantments = tool.enchants;
    return Array.isArray(enchantments) ? enchantments : [];
  } catch {
    return [];
  }
}

function installSafeDigTime(bot) {
  bot.digTime = (block) => {
    const heldItem = bot.heldItem;
    const type = heldItem ? heldItem.type : null;
    let enchantments = getToolEnchantments(heldItem);

    const headSlot = bot.getEquipmentDestSlot('head');
    const helmet = bot.inventory.slots[headSlot];
    enchantments = enchantments.concat(getToolEnchantments(helmet));

    const creative = bot.game.gameMode === 'creative';
    const inWater = ['water', 'flowing_water'].includes(bot._getBlockAtEyeLevel()?.name);
    return block.digTime(
      type,
      creative,
      inWater,
      !bot.entity.onGround,
      enchantments,
      bot.entity.effects || {}
    );
  };
}

function installSafeBestHarvestTool(bot) {
  bot.pathfinder.bestHarvestTool = (block) => {
    const effects = bot.entity.effects || {};
    let fastest = Number.MAX_VALUE;
    let best = null;

    for (const tool of bot.inventory.items()) {
      const digTime = block.digTime(
        tool ? tool.type : null,
        false,
        false,
        false,
        getToolEnchantments(tool),
        effects
      );
      if (digTime < fastest) {
        fastest = digTime;
        best = tool;
      }
    }
    return best;
  };
}

function getOpenState(block) {
  return block?.getProperties?.().open === true;
}

function getPrimaryOpenableBlock(bot, block) {
  if (!block?.position || block.getProperties?.().half !== 'upper') return block;
  return bot.blockAt(block.position.offset(0, -1, 0)) || block;
}

function getBlockKey(block) {
  return block?.position ? block.position.toString() : '';
}

/**
 * Ouvre automatiquement les portes fermées proches du bot pendant les déplacements.
 * Approche proactive : indépendante du pathfinder, aucun risque d'interférence.
 */
function installDoorAutoOpener(bot) {
  const recentlyActivated = new Map();

  const onPhysicsTick = () => {
    if (!bot.pathfinder.isMoving()) return;
    const pos = bot.entity.position;
    const now = Date.now();

    outer:
    for (const dx of [-1, 0, 1]) {
      for (const dz of [-1, 0, 1]) {
        if (dx === 0 && dz === 0) continue;
        for (const dy of [0, 1]) {
          const block = bot.blockAt(pos.offset(dx, dy, dz));
          if (!block || !canOpenByHand(block)) continue;
          const lower = getPrimaryOpenableBlock(bot, block);
          if (!lower || getOpenState(lower)) continue;

          const key = getBlockKey(lower);
          const last = recentlyActivated.get(key);
          if (last && now - last < DOOR_OPEN_COOLDOWN_MS) continue;

          recentlyActivated.set(key, now);
          bot.activateBlock(block).catch(() => {});
          break outer;
        }
      }
    }

    for (const [key, time] of recentlyActivated) {
      if (now - time > DOOR_OPEN_COOLDOWN_MS * 2) recentlyActivated.delete(key);
    }
  };

  bot.on('physicsTick', onPhysicsTick);
  bot.once('end', () => bot.off('physicsTick', onPhysicsTick));
}

class StructureAwareMovements extends Movements {
  constructor(bot) {
    super(bot);
    installDoorAutoOpener(bot);
    installSafeDigTime(bot);
    installSafeBestHarvestTool(bot);
    bot.__structureAwareMovements = this;

    // canOpenDoors = false : le mécanisme natif du pathfinder (useOne) laisse
    // `placing` à true sans le remettre à false après activation, ce qui déclenche
    // un resetPath('no_scaffolding_blocks') systématique. On gère les portes via
    // installDoorAutoOpener (physicsTick) à la place.
    this.canOpenDoors = false;
    this.allow1by1towers = false;
    this.digCost = Math.max(this.digCost, 25);

    ['grass_block', 'coarse_dirt', 'cobbled_deepslate'].forEach(name => {
      const item = bot.registry.itemsByName[name];
      if (item && !this.scafoldingBlocks.includes(item.id)) this.scafoldingBlocks.push(item.id);
    });

    bot.registry.blocksArray.forEach(block => {
      if (isProtectedTraversalBlock(block)) this.blocksCantBreak.add(block.id);
      if (canOpenByHand(block)) this.openable.add(block.id);
    });
  }

  getBlock(pos, dx, dy, dz) {
    const block = super.getBlock(pos, dx, dy, dz);
    // Toutes les portes (ouvertes ou fermées) sont traitées comme de l'air par le
    // pathfinder. L'ouverture réelle est assurée par installDoorAutoOpener.
    // Sans ça, une porte ouverte a boundingBox='block' (shapes de panneau latéral)
    // → safe=false, physical=true → le pathfinder planifie autour d'elle.
    if (this.openable.has(block.type)) {
      block.openable = false;
      block.physical = false;
      block.safe = true;
      block.height = pos.y + dy;
    }
    return block;
  }

  safeOrBreak(block, toBreak) {
    // A closed door occupies both body and head space. The lower block is
    // activated by pathfinder; its upper half must also be treated as passable.
    if (block && this.openable.has(block.type)) return this.exclusionStep(block);

    let cost = this.exclusionStep(block);
    cost += this.getNumEntitiesAt(block.position, 0, 0, 0) * this.entityCost;
    if (block.safe) return cost;
    if (!this.safeToBreak(block)) return 100;
    toBreak.push(block.position);

    if (block.physical) {
      cost += this.getNumEntitiesAt(block.position, 0, 1, 0) * this.entityCost;
    }

    const tool = this.bot.pathfinder.bestHarvestTool(block);
    const effects = this.bot.entity.effects || {};
    const digTime = block.digTime(
      tool ? tool.type : null,
      false,
      false,
      false,
      getToolEnchantments(tool),
      effects
    );
    return cost + (1 + 3 * digTime / 1000) * this.digCost;
  }
}


/**
 * Fait venir le bot vers un joueur.
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Nom du joueur cible
 */
async function comeToPlayer(bot, username) {
  const player = bot.players[username];
  if (!player?.entity) {
    bot.chat('Je ne te vois pas.');
    return;
  }
  const { x, y, z } = player.entity.position;
  await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2));
  bot.chat('Me voilà.');
}

/**
 * Fait suivre le bot un joueur (approximation : va vers sa position actuelle).
 *
 * @param {Object} bot      - Instance Mineflayer
 * @param {string} username - Nom du joueur
 */
async function followPlayer(bot, username) {
  const player = bot.players[username];
  if (!player?.entity) return;
  const goal = new goals.GoalFollow(player.entity, 3);
  bot.pathfinder.setGoal(goal, true);
}

/**
 * Arrête tout déplacement.
 *
 * @param {Object} bot - Instance Mineflayer
 */
function stop(bot) {
  bot.pathfinder.setGoal(null);
  bot.chat('Arrêt.');
}

/**
 * Va à une position précise.
 *
 * @param {Object} bot - Instance Mineflayer
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
async function goToPosition(bot, x, y, z) {
  await bot.pathfinder.goto(new goals.GoalBlock(x, y, z));
}

/**
 * Va à un emplacement sauvegardé en mémoire.
 *
 * @param {Object} bot  - Instance Mineflayer
 * @param {string} name - Clé dans memory.json (ex: "base", "main_chest")
 */
async function goToSavedLocation(bot, name) {
  const loc = memory.get(name);
  if (!loc) {
    bot.chat(`Emplacement "${name}" inconnu.`);
    return;
  }
  await goToPosition(bot, loc.x, loc.y, loc.z);
}

module.exports = {
  StructureAwareMovements,
  canOpenByHand,
  getOpenState,
  getToolEnchantments,
  getPrimaryOpenableBlock,
  installDoorAutoOpener,
  installSafeDigTime,
  installSafeBestHarvestTool,
  comeToPlayer,
  followPlayer,
  goToPosition,
  goToSavedLocation,
  isProtectedTraversalBlock,
  stop
};

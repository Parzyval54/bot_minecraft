/**
 * bot.js — Point d'entrée principal
 * Crée le bot Mineflayer et l'injecte dans tous les modules.
 */

require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const commandHandler = require('./commandHandler');
const botStatus = require('./state/botStatus');

const config = {
  host: process.env.MC_HOST || 'localhost',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'AgentBot',
  auth: process.env.MC_AUTH || 'offline'
};

if (process.env.MC_VERSION?.trim()) {
  config.version = process.env.MC_VERSION.trim();
}

const bot = mineflayer.createBot(config);

// Chargement du plugin de déplacement automatique
bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
  // Configurer les mouvements par défaut
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  botStatus.init(bot);
  bot.chat(`${bot.username} connecte.`);
  console.log('[BOT] Connecté et prêt.');
});

// Écoute des messages de chat → commandHandler
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  console.log(`[CHAT] ${username}: ${message}`);
  if (/^agent\b/i.test(message)) {
    commandHandler.handle(bot, username, message);
  }
});

bot.on('kicked', (reason) => {
  console.error('[BOT] Expulse du serveur :', reason);
});

bot.on('error', (err) => {
  console.error('[BOT] Erreur :', err.message);
});

bot.on('end', () => {
  console.log('[BOT] Connexion terminée.');
});

/**
 * bot.js — Point d'entrée principal
 * Crée le bot Mineflayer et l'injecte dans tous les modules.
 */

require('dotenv').config();
const net = require('net');
const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const commandHandler = require('./commandHandler');
const { StructureAwareMovements } = require('./actions/movement');
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

function waitForServer(host, port, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
    };

    const timer = setTimeout(() => {
      cleanup();
      const error = new Error(`Timeout en essayant de joindre ${host}:${port}`);
      error.code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve();
    });

    socket.once('error', (error) => {
      cleanup();
      reject(error);
    });
  });
}

function formatConnectionError(host, port, error) {
  if (error?.code === 'ECONNREFUSED') {
    return `Aucun serveur Minecraft n'écoute sur ${host}:${port}. Lance le serveur ou corrige MC_HOST/MC_PORT.`;
  }

  if (error?.code === 'ETIMEDOUT') {
    return `Impossible de joindre ${host}:${port} avant expiration du délai.`;
  }

  if (error?.errors?.length) {
    const details = error.errors
      .map((item) => `${item.address || host}:${item.port || port} (${item.code || item.message})`)
      .join(', ');
    return `Impossible de joindre ${host}:${port} : ${details}`;
  }

  return `Impossible de joindre ${host}:${port} : ${error?.message || 'erreur inconnue'}`;
}

async function main() {
  try {
    await waitForServer(config.host, config.port);
  } catch (error) {
    console.error(`[BOT] ${formatConnectionError(config.host, config.port, error)}`);
    process.exit(1);
    return;
  }

  const bot = mineflayer.createBot(config);

  // Chargement du plugin de déplacement automatique
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    // Configurer les mouvements par défaut
    const defaultMove = new StructureAwareMovements(bot);
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
}

main().catch((error) => {
  console.error('[BOT] Erreur fatale :', error.message);
  process.exit(1);
});

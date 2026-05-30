/**
 * llm.js — Interface avec Ollama (LLM local)
 *
 * RÈGLE DE SÉCURITÉ : Le LLM ne produit que du JSON structuré.
 * Jamais de code JavaScript à exécuter. Jamais d'eval().
 */

const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

/**
 * Envoie un état résumé + une instruction au LLM.
 * Retourne un objet JSON validé (intention structurée).
 *
 * @param {string} instruction - Commande du joueur (ex: "construis une petite maison ici")
 * @param {Object} botState    - État résumé du bot (position, santé, inventaire, mémoire...)
 * @returns {Object|null}      - L'objet JSON produit par le LLM, ou null en cas d'erreur
 */
async function askLLM(instruction, botState) {
  const systemPrompt = `
Tu es un planificateur pour un agent Minecraft en mode survie.
Tu reçois une instruction en langage naturel et l'état actuel du bot.
Tu dois répondre UNIQUEMENT avec un objet JSON valide représentant l'intention structurée.
N'écris jamais de code JavaScript. Ne génère jamais de liste de blocs.
Produis seulement une intention de haut niveau.

Format attendu :
{
  "goal": "nom_du_but",
  "location": "player_position | saved_location | coordinates",
  "blueprint": "nom_du_blueprint | null",
  "constraints": {
    "mode": "survival",
    "allow_resource_gathering": true,
    "allow_crafting": true
  }
}
`;

  const userMessage = `
Instruction : "${instruction}"
État du bot :
${JSON.stringify(botState, null, 2)}
`;

  try {
    const response = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: false
    });

    const raw = response.data.message.content.trim();

    // Extraire uniquement le bloc JSON (sécurité : ignorer tout texte autour)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[LLM] Réponse non JSON :', raw);
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[LLM] Erreur lors de l\'appel :', err.message);
    return null;
  }
}

module.exports = { askLLM };

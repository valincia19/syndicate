/**
 * Interaction Handler
 *
 * Responsibilities:
 *   1. Auto-load all button handlers from src/interactions/buttons/
 *   2. Support other component interaction types (select menus, modals) in a structured manner
 *
 * Adding a new button:
 *   - Create a file in src/interactions/buttons/<name>.js
 *   - Export: { customId: 'id', execute: async (interaction, client) => {} }
 */

const fs = require('fs');
const path = require('path');

/**
 * Load all interactions (buttons, etc.) into the client Collections.
 * @param {import('discord.js').Client} client
 */
const loadInteractions = async (client) => {
  // Initialize collections if they don't exist
  client.buttons = client.buttons || new Map();
  client.selectMenus = client.selectMenus || new Map();
  client.modals = client.modals || new Map();

  const interactionsPath = path.join(__dirname, '..', 'interactions');

  // Load Buttons
  const buttonsPath = path.join(interactionsPath, 'buttons');
  if (fs.existsSync(buttonsPath)) {
    const buttonFiles = fs.readdirSync(buttonsPath).filter((f) => f.endsWith('.js'));
    for (const file of buttonFiles) {
      const button = require(path.join(buttonsPath, file));
      if (button.customId && button.execute) {
        client.buttons.set(button.customId, button);
        console.log(`[InteractionHandler] Loaded Button: ${button.customId}`);
      } else {
        console.warn(`[InteractionHandler] Skipping button file ${file}: missing "customId" or "execute"`);
      }
    }
  }

  // Load Select Menus (Placeholder for future expansion)
  const selectMenusPath = path.join(interactionsPath, 'selectMenus');
  if (fs.existsSync(selectMenusPath)) {
    const menuFiles = fs.readdirSync(selectMenusPath).filter((f) => f.endsWith('.js'));
    for (const file of menuFiles) {
      const menu = require(path.join(selectMenusPath, file));
      if (menu.customId && menu.execute) {
        client.selectMenus.set(menu.customId, menu);
        console.log(`[InteractionHandler] Loaded Select Menu: ${menu.customId}`);
      }
    }
  }

  // Load Modals (Placeholder for future expansion)
  const modalsPath = path.join(interactionsPath, 'modals');
  if (fs.existsSync(modalsPath)) {
    const modalFiles = fs.readdirSync(modalsPath).filter((f) => f.endsWith('.js'));
    for (const file of modalFiles) {
      const modal = require(path.join(modalsPath, file));
      if (modal.customId && modal.execute) {
        client.modals.set(modal.customId, modal);
        console.log(`[InteractionHandler] Loaded Modal: ${modal.customId}`);
      }
    }
  }
};

module.exports = { loadInteractions };

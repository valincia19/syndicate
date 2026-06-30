/**
 * Event Handler
 *
 * Auto-loads all event files from src/events/
 *
 * Adding a new event:
 *   - Create a file in src/events/<eventName>.js
 *   - Export: { name: 'eventName', once?: true, execute: async (...args) => {} }
 *   - No manual registration needed — this handler picks it up automatically
 */

const fs = require('fs');
const path = require('path');

/**
 * Load all events from src/events/ and register them to the Discord client.
 * @param {import('discord.js').Client} client
 */
const loadEvents = async (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || !event.execute) {
      console.warn(`[EventHandler] Skipping ${file}: missing "name" or "execute" export`);
      continue;
    }

    if (event.disabled) {
      console.warn(`[EventHandler] Skipping ${event.name}: disabled (pending intent approval)`);
      continue;
    }

    if (event.once) {
      // Register as one-time listener (e.g. ready)
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      // Register as persistent listener
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    console.log(`[EventHandler] Registered event: ${event.name}${event.once ? ' (once)' : ''}`);
  }
};

module.exports = { loadEvents };

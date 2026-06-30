/**
 * Event: ready
 * Fires once when the bot successfully connects to the Discord Gateway.
 */

const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true, // Only runs once on startup

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag} (ID: ${client.user.id})`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

    // Set bot presence / status
    client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: 'VALINC SYNDICATE',
          type: ActivityType.Watching,
        },
      ],
    });
  },
};

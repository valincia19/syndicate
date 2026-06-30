/**
 * Command Handler
 *
 * Responsibilities:
 *   1. Auto-load all command files from src/commands/
 *   2. Register slash commands to Discord API on startup (guild-scoped for instant updates)
 *
 * Adding a new command:
 *   - Create a file in src/commands/<name>.js
 *   - Export: { data: SlashCommandBuilder, execute: async (interaction) => {} }
 *   - No manual registration needed — this handler picks it up automatically
 */

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

/**
 * Load all commands from src/commands/ and register them to Discord API.
 * @param {import('discord.js').Client} client
 */
const loadCommands = async (client) => {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  const commandsJson = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
      console.warn(`[CommandHandler] Skipping ${file}: missing "data" or "execute" export`);
      continue;
    }

    client.commands.set(command.data.name, command);
    commandsJson.push(command.data.toJSON());
    console.log(`[CommandHandler] Loaded command: /${command.data.name}`);
  }

  // Register slash commands to Discord API (guild-scoped = instant update, no 1hr cache)
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    console.log(`[CommandHandler] Registering ${commandsJson.length} slash command(s) to guild ${process.env.DISCORD_GUILD_ID}...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commandsJson }
    );

    console.log('[CommandHandler] Slash commands registered successfully');
  } catch (error) {
    console.error('[CommandHandler] Failed to register slash commands:', error);
  }
};

module.exports = { loadCommands };

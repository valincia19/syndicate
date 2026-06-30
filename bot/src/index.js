/**
 * VALINC SYNDICATE — Discord Bot
 * Entry Point
 *
 * Architecture:
 *   index.js  →  handlers/  →  commands/ + events/
 *
 * Communication:
 *   Bot → Backend internal API (http://valinc-backend:5000/v1/internal/*)
 *   Authenticated via X-Internal-Secret header
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// ── Validate required environment variables ────────────────────────────────
const REQUIRED_ENV = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Bot] FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ── Create Discord Client ──────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // GatewayIntentBits.GuildMembers,  // TODO: Re-enable after Discord approves Server Members Intent
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
  ],
});

// ── Attach command collection to client ───────────────────────────────────
// This allows event handlers to access slash commands via client.commands
client.commands = new Collection();

// ── Load handlers ─────────────────────────────────────────────────────────
(async () => {
  try {
    await loadCommands(client);
    await loadEvents(client);

    // Login to Discord gateway
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('[Bot] FATAL: Failed to initialize bot:', error);
    process.exit(1);
  }
})();

// ── Graceful shutdown ──────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`[Bot] Received ${signal}. Shutting down gracefully...`);
  client.destroy();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Bot] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Bot] Unhandled promise rejection:', reason);
});

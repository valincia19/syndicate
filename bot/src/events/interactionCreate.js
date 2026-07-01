/**
 * Event: interactionCreate
 * Handles slash commands and button interactions (panel_my_keys).
 */

module.exports = {
  name: 'interactionCreate',

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // ── Slash Commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`[Bot] Unknown slash command: /${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[Bot] Error executing /${interaction.commandName}:`, error);

        const errorMessage = {
          content: '❌ An error occurred while executing this command.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }

    // ── Button Interactions ──────────────────────────────────────────────────
    if (interaction.isButton()) {
      const button = client.buttons.get(interaction.customId);
      if (!button) {
        console.warn(`[Bot] Unknown button interaction: ${interaction.customId}`);
        return;
      }

      try {
        await button.execute(interaction, client);
      } catch (error) {
        console.error(`[Bot] Error executing button ${interaction.customId}:`, error);

        const errorMessage = {
          content: '❌ An error occurred while processing this interaction.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }

    // ── Select Menu Interactions ─────────────────────────────────────────────
    if (interaction.isAnySelectMenu()) {
      const menu = client.selectMenus.get(interaction.customId);
      if (!menu) {
        console.warn(`[Bot] Unknown select menu interaction: ${interaction.customId}`);
        return;
      }

      try {
        await menu.execute(interaction, client);
      } catch (error) {
        console.error(`[Bot] Error executing select menu ${interaction.customId}:`, error);

        const errorMessage = {
          content: '❌ An error occurred while processing this menu.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }

    // ── Modal Submissions ───────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const modal = client.modals.get(interaction.customId);
      if (!modal) {
        console.warn(`[Bot] Unknown modal submission: ${interaction.customId}`);
        return;
      }

      try {
        await modal.execute(interaction, client);
      } catch (error) {
        console.error(`[Bot] Error executing modal submit ${interaction.customId}:`, error);

        const errorMessage = {
          content: '❌ An error occurred while processing this form.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }
  },
};

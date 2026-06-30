/**
 * Slash Command: /ping
 * Checks bot latency and WebSocket heartbeat.
 * Useful as a health check and example command.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency and connection status'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Defer to measure round-trip latency accurately
    await interaction.deferReply({ ephemeral: true });

    const sent = await interaction.fetchReply();
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsHeartbeat = client.ws.ping;

    const latencyColor =
      roundTrip < 100 ? 0x57f287 :   // Green (fast)
      roundTrip < 300 ? 0xfee75c :   // Yellow (ok)
                        0xed4245;    // Red (slow)

    const embed = new EmbedBuilder()
      .setColor(latencyColor)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Round-trip', value: `${roundTrip}ms`, inline: true },
        { name: '💓 WS Heartbeat', value: `${wsHeartbeat}ms`, inline: true },
        { name: '🤖 Status', value: 'Online', inline: true }
      )
      .setFooter({ text: 'VALINC SYNDICATE Bot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

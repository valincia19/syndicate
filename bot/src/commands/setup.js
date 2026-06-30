/**
 * Slash Command: /setup panel <channel>
 * Admin inputs a channel → bot sends the VALINC SYNDICATE panel embed to that channel.
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the VALINC SYNDICATE bot')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Send the VALINC SYNDICATE panel to a channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The text channel to send the panel to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'panel') {
      // Only allow server admins
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ You need **Administrator** permission to use this command.',
          ephemeral: true,
        });
      }

      const channel = interaction.options.getChannel('channel');

      // Check bot permissions in target channel
      const botMember = interaction.guild?.members.me;
      const perms = channel.permissionsFor(botMember);
      if (!perms?.has('SendMessages') || !perms?.has('EmbedLinks')) {
        return interaction.reply({
          content: `❌ I don't have permission to send messages or embeds in ${channel}. Please check my permissions.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      // Build the VALINC SYNDICATE panel embed
      const panelEmbed = new EmbedBuilder()
        .setColor(0x2b2d31) // Discord dark embed color — clean & neutral
        .setAuthor({ name: 'VALINC SYNDICATE', url: 'https://vinzhub.com' })
        .setDescription(
          'Premium Roblox scripting platform with HWID-locked licensing, ' +
          'auto-updates, and a built-in key system.\n\n' +
          '```\n' +
          'Portal     →  vinzhub.com/portal\n' +
          'Free Key   →  keyauth.vinzhub.com\n' +
          'Status     →  Operational\n' +
          '```'
        )
        .setFooter({ text: 'vinzhub.com' })
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Portal')
          .setStyle(ButtonStyle.Link)
          .setURL('https://vinzhub.com/portal'),
        new ButtonBuilder()
          .setCustomId('panel_my_keys')
          .setLabel('My Keys')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Get Free Key')
          .setStyle(ButtonStyle.Link)
          .setURL('https://keyauth.vinzhub.com'),
        new ButtonBuilder()
          .setLabel('Docs')
          .setStyle(ButtonStyle.Link)
          .setURL('https://vinzhub.com')
      );

      try {
        await channel.send({ embeds: [panelEmbed], components: [buttons] });

        await interaction.editReply({
          content: `✅ Panel sent to ${channel} successfully!`,
        });

        console.log(`[Bot:Setup] Panel sent to #${channel.name} (${channel.id}) by ${interaction.user.tag}`);
      } catch (error) {
        console.error(`[Bot:Setup] Failed to send panel:`, error.message);
        await interaction.editReply({
          content: `❌ Failed to send panel to ${channel}: ${error.message}`,
        });
      }
    }
  },
};

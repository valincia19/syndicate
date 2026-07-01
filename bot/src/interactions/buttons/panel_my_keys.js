const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  customId: 'panel_my_keys',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
    const secret = process.env.INTERNAL_API_SECRET || '';

    try {
      const res = await fetch(`${backendUrl}/v1/internal/keys/${discordId}`, {
        headers: { 'X-Internal-Secret': secret },
      });

      const data = await res.json();

      if (!data.success) {
        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({ name: 'My Keys' })
          .setDescription(
            'Your Discord account is not linked or you do not have any active premium keys.\n\n' +
            'Please login to link your account and purchase a key at [vinzhub.com/portal](https://vinzhub.com/portal) to get started.'
          )
          .setFooter({ text: 'vinzhub.com' });

        return interaction.editReply({ embeds: [embed] });
      }

      const { keys, user, message } = data.data;

      // No linked account
      if (message === 'No linked account found') {
        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({ name: 'My Keys' })
          .setDescription(
            'Your Discord account is not linked to any VALINC SYNDICATE account.\n\n' +
            'Login via Discord on [vinzhub.com/portal](https://vinzhub.com/portal) to link your account.'
          )
          .setFooter({ text: 'vinzhub.com' });

        return interaction.editReply({ embeds: [embed] });
      }

      // No premium keys
      if (!keys || keys.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({ name: `My Keys - ${user?.name || 'User'}` })
          .setDescription(
            "You don't have any premium or pro keys.\n\n" +
            "Free keys are not displayed here.\n" +
            "Purchase a plan at [vinzhub.com/portal](https://vinzhub.com/portal) to get started."
          )
          .setFooter({ text: 'vinzhub.com' });

        return interaction.editReply({ embeds: [embed] });
      }

      // Build key list
      const keyLines = keys.map((k, i) => {
        const status = k.status === 'active' ? '● Active' : k.status === 'expired' ? '○ Expired' : k.status;
        const tier = k.tier.charAt(0).toUpperCase() + k.tier.slice(1);
        const expires = k.expires_at
          ? `<t:${Math.floor(new Date(k.expires_at).getTime() / 1000)}:R>`
          : 'Never';

        return `**${i + 1}.** \`${k.license_key}\`\n   ${tier} · ${status} · Expires ${expires}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: `My Keys - ${user?.name || 'User'}` })
        .setDescription(
          keyLines.join('\n\n') +
          '\n\n*Free keys are not shown here.*'
        )
        .setFooter({ text: `${keys.length} key${keys.length > 1 ? 's' : ''} · vinzhub.com` })
        .setTimestamp();

      const copyBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('panel_copy_keys')
          .setLabel('Copy All')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [copyBtn] });
    } catch (error) {
      console.error('[Bot:MyKeys] Error fetching keys:', error.message);
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ name: 'My Keys' })
        .setDescription(
          'Could not retrieve license details at this time.\n\n' +
          'Please ensure your account is linked and you have purchased a key at [vinzhub.com/portal](https://vinzhub.com/portal).'
        )
        .setFooter({ text: 'vinzhub.com' });

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

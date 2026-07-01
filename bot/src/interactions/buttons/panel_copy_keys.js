module.exports = {
  customId: 'panel_copy_keys',
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

      if (!data.success || !data.data.keys || data.data.keys.length === 0) {
        return interaction.editReply({
          content: '❌ You do not have any premium keys to copy. Please login and purchase a key at https://vinzhub.com/portal first.'
        });
      }

      const plainKeys = data.data.keys
        .map((k) => k.license_key)
        .join('\n');

      await interaction.editReply({ content: plainKeys });
    } catch (error) {
      console.error('[Bot:CopyKeys] Error:', error.message);
      await interaction.editReply({
        content: '❌ Could not retrieve keys to copy. Make sure your account is linked and you have active premium keys at https://vinzhub.com/portal.'
      });
    }
  },
};

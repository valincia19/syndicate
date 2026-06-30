/**
 * Event: guildMemberAdd
 * Fires whenever a new user joins the Discord server.
 * Sends a welcome embed to the configured welcome channel.
 *
 * NOTE: Requires Server Members Intent (Privileged) to be enabled in Discord Dev Portal.
 * Currently disabled pending intent approval — re-enable by setting disabled: false.
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  disabled: true, // TODO: Set to false after Discord approves Server Members Intent

  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').Client} client
   */
  async execute(member, client) {
    const welcomeChannelId = process.env.DISCORD_WELCOME_CHANNEL_ID;

    if (!welcomeChannelId) {
      console.warn('[Bot:guildMemberAdd] DISCORD_WELCOME_CHANNEL_ID not set — skipping welcome message');
      return;
    }

    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) {
      console.warn(`[Bot:guildMemberAdd] Welcome channel ${welcomeChannelId} not found in guild`);
      return;
    }

    const memberCount = member.guild.memberCount;
    const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });
    const joinedAt = `<t:${Math.floor(Date.now() / 1000)}:R>`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2) // Discord blurple
      .setTitle('👋 New Member Joined!')
      .setDescription(
        `Welcome to **VALINC SYNDICATE**, ${member}!\n\n` +
        `We're glad to have you here. You are member **#${memberCount}**.\n\n` +
        `> Check out the channels to get started and grab your key from our portal.`
      )
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '🧑 Username', value: member.user.tag, inline: true },
        { name: '📅 Joined', value: joinedAt, inline: true },
        { name: '👥 Members', value: `#${memberCount}`, inline: true }
      )
      .setFooter({ text: 'VALINC SYNDICATE • vinzhub.com' })
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
      console.log(`[Bot:guildMemberAdd] Welcome message sent for ${member.user.tag}`);
    } catch (error) {
      console.error(`[Bot:guildMemberAdd] Failed to send welcome message:`, error.message);
    }
  },
};

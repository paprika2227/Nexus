const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the bot invite link"),

  async execute(interaction) {
    // Replace with your actual bot client ID
    const botId = interaction.client.user.id;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setTitle("🔗 Invite Nexus Bot")
      .setDescription(
        "Add Nexus to your server for advanced security and moderation features!"
      )
      .addFields(
        {
          name: "✨ Features",
          value: [
            "🛡️ Advanced anti-raid & anti-nuke",
            "🤖 AI-powered security recommendations",
            "📊 Interactive dashboard",
            "🔓 Open source & 100% free",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📋 Required Permissions",
          value: [
            "• Manage Server (for security features)",
            "• Manage Roles (for auto-roles)",
            "• Manage Channels (for moderation)",
            "• Ban/Kick Members (for protection)",
            "• Manage Messages (for auto-mod)",
          ].join("\n"),
          inline: false,
        }
      )
      .setColor(0x0099ff)
      .setFooter({
        text: "Nexus - Beyond Wick. Free. Open Source. Powerful.",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite Nexus")
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel("Support Server")
        .setURL("https://discord.gg/UHNcUKheZP")
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel("GitHub")
        .setURL("https://github.com/Azzraya/Nexus")
        .setStyle(ButtonStyle.Link)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};

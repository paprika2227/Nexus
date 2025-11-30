const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear warnings for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to clear warnings for")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("user");

    await db.clearWarnings(interaction.guild.id, user.id);

    await interaction.reply({
      embeds: [
        {
          title: "✅ Warnings Cleared",
          description: `Cleared all warnings for ${user.tag}`,
          color: 0x00ff00,
        },
      ],
    });
  },
};

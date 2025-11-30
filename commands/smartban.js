const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Security = require("../utils/security");
const db = require("../utils/database");
const Moderation = require("../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("smartban")
    .setDescription("AI-powered ban with threat analysis ")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for ban")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("analyze")
        .setDescription("Run threat analysis before banning")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const analyze = interaction.options.getBoolean("analyze") ?? true;

    await interaction.deferReply();

    let threatAnalysis = null;
    if (analyze) {
      threatAnalysis = await Security.detectThreat(
        interaction.guild,
        user,
        "ban"
      );
    }

    const result = await Moderation.ban(
      interaction.guild,
      user,
      interaction.user,
      reason,
      1
    );

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle("✅ Smart Ban Executed")
        .setDescription(`${user.tag} has been banned`)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setColor(0xff0000)
        .setTimestamp();

      if (threatAnalysis) {
        embed.addFields({
          name: "🔍 Threat Analysis",
          value: [
            `**Threat Score:** ${threatAnalysis.score}%`,
            `**Level:** ${threatAnalysis.level.toUpperCase()}`,
            `**Patterns Detected:** ${threatAnalysis.patterns?.length || 0}`,
          ].join("\n"),
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: `❌ ${result.message}`,
      });
    }
  },
};

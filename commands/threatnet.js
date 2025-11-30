const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const ThreatIntelligence = require("../utils/threatIntelligence");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("threatnet")
    .setDescription(
      "Threat Intelligence Network - Cross-server threat sharing "
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("report")
        .setDescription("Report a threat to the network")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to report")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Threat type")
            .setRequired(true)
            .addChoices(
              { name: "Raid", value: "raid" },
              { name: "Spam", value: "spam" },
              { name: "Scam", value: "scam" },
              { name: "Harassment", value: "harassment" },
              { name: "Other", value: "other" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("severity")
            .setDescription("Threat severity")
            .setRequired(true)
            .addChoices(
              { name: "Critical", value: "critical" },
              { name: "High", value: "high" },
              { name: "Medium", value: "medium" },
              { name: "Low", value: "low" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("details")
            .setDescription("Additional details")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription("Check if a user is in the threat database")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("verify")
        .setDescription("Verify a threat report")
        .addIntegerOption((option) =>
          option
            .setName("threat_id")
            .setDescription("Threat ID to verify")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "report") {
      const user = interaction.options.getUser("user");
      const type = interaction.options.getString("type");
      const severity = interaction.options.getString("severity");
      const details =
        interaction.options.getString("details") || "No details provided";

      await ThreatIntelligence.reportThreat(
        user.id,
        type,
        { details, reportedBy: interaction.user.id },
        severity,
        interaction.guild.id
      );

      await interaction.reply({
        content: `✅ Threat reported to network: ${user.tag} (${type}, ${severity})`,
        ephemeral: true,
      });
    } else if (subcommand === "check") {
      await interaction.deferReply();

      const user = interaction.options.getUser("user");
      const threatInfo = await ThreatIntelligence.checkThreat(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Threat Check: ${user.tag}`)
        .addFields(
          {
            name: "Status",
            value: threatInfo.hasThreat ? "⚠️ Threat Found" : "✅ No Threats",
            inline: true,
          },
          {
            name: "Risk Score",
            value: `${threatInfo.riskScore}%`,
            inline: true,
          },
          {
            name: "Threat Count",
            value: `${threatInfo.threatCount}`,
            inline: true,
          },
          {
            name: "Verified Reports",
            value: `${threatInfo.verifiedCount}`,
            inline: true,
          },
          {
            name: "Recent Threats",
            value: `${threatInfo.recentCount} (last 7 days)`,
            inline: true,
          }
        )
        .setColor(threatInfo.hasThreat ? 0xff0000 : 0x00ff00)
        .setTimestamp();

      if (threatInfo.threats && threatInfo.threats.length > 0) {
        embed.addFields({
          name: "Recent Threats",
          value: threatInfo.threats
            .slice(0, 5)
            .map(
              (t) =>
                `**${t.threat_type}** (${t.severity}) - ${new Date(
                  t.reported_at
                ).toLocaleDateString()}`
            )
            .join("\n"),
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "verify") {
      const threatId = interaction.options.getInteger("threat_id");
      await ThreatIntelligence.verifyThreat(threatId);

      await interaction.reply({
        content: `✅ Threat #${threatId} verified`,
        ephemeral: true,
      });
    }
  },
};

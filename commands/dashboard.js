const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("View comprehensive server analytics dashboard")
    .addStringOption((option) =>
      option
        .setName("view")
        .setDescription("Dashboard view")
        .setRequired(false)
        .addChoices(
          { name: "Overview", value: "overview" },
          { name: "Security", value: "security" },
          { name: "Moderation", value: "moderation" },
          { name: "Activity", value: "activity" },
          { name: "Performance", value: "performance" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const view = interaction.options.getString("view") || "overview";

    if (view === "overview") {
      // Get comprehensive stats
      const totalCases = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT COUNT(*) as count FROM moderation_logs WHERE guild_id = ?",
          [interaction.guild.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      const totalWarnings = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ?",
          [interaction.guild.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      const recentRaids = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT COUNT(*) as count FROM anti_raid_logs WHERE guild_id = ? AND timestamp > ?",
          [interaction.guild.id, Date.now() - 86400000],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      const config = await db.getServerConfig(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle("📊 Nexus Dashboard - Overview")
        .setDescription("Comprehensive server analytics and insights")
        .addFields(
          {
            name: "🛡️ Security Status",
            value: [
              `Anti-Raid: ${config?.anti_raid_enabled ? "✅" : "❌"}`,
              `Anti-Nuke: ${config?.anti_nuke_enabled ? "✅" : "❌"}`,
              `Join Gate: ${config?.join_gate_enabled ? "✅" : "❌"}`,
              `Heat System: ${config?.heat_system_enabled ? "✅" : "❌"}`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "📈 Statistics",
            value: [
              `Total Cases: **${totalCases}**`,
              `Total Warnings: **${totalWarnings}**`,
              `Raids (24h): **${recentRaids}**`,
              `Members: **${interaction.guild.memberCount}**`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "⚡ Quick Actions",
            value: "Use buttons below to view detailed sections",
            inline: false,
          }
        )
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({
          text: "Nexus - Beyond Wick. Free. Open Source. Powerful.",
        });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dashboard_security")
          .setLabel("Security")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_moderation")
          .setLabel("Moderation")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_activity")
          .setLabel("Activity")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_performance")
          .setLabel("Performance")
          .setStyle(ButtonStyle.Success)
      );

      // Check if this is a button interaction (update) or command (reply)
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [buttons] });
      } else {
        await interaction.reply({ embeds: [embed], components: [buttons] });
      }
    } else if (view === "security") {
      // Security dashboard
      const recentThreats = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM security_logs WHERE guild_id = ? AND timestamp > ? ORDER BY threat_score DESC LIMIT 10",
          [interaction.guild.id, Date.now() - 86400000],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      const avgThreatScore = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT AVG(threat_score) as avg FROM security_logs WHERE guild_id = ? AND timestamp > ?",
          [interaction.guild.id, Date.now() - 86400000],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.avg || 0);
          }
        );
      });

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Security Dashboard")
        .addFields(
          {
            name: "📊 24h Statistics",
            value: [
              `Threats Detected: **${recentThreats.length}**`,
              `Avg Threat Score: **${Math.round(avgThreatScore)}%**`,
              `High Risk (>80%): **${
                recentThreats.filter((t) => t.threat_score >= 80).length
              }**`,
            ].join("\n"),
            inline: true,
          },
          {
            name: "🔍 Top Threats",
            value:
              recentThreats.length > 0
                ? recentThreats
                    .slice(0, 5)
                    .map(
                      (t, i) => `${i + 1}. <@${t.user_id}> - ${t.threat_score}%`
                    )
                    .join("\n")
                : "No threats detected",
            inline: false,
          }
        )
        .setColor(0xff0000)
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dashboard_overview")
          .setLabel("Overview")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("dashboard_security")
          .setLabel("Security")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_moderation")
          .setLabel("Moderation")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_activity")
          .setLabel("Activity")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_performance")
          .setLabel("Performance")
          .setStyle(ButtonStyle.Success)
      );

      // Check if this is a button interaction (update) or command (reply)
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [buttons] });
      } else {
        await interaction.reply({ embeds: [embed], components: [buttons] });
      }
    } else if (view === "moderation") {
      // Moderation dashboard
      const recentActions = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT action, COUNT(*) as count FROM moderation_logs WHERE guild_id = ? AND timestamp > ? GROUP BY action",
          [interaction.guild.id, Date.now() - 86400000],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      const embed = new EmbedBuilder()
        .setTitle("🔨 Moderation Dashboard")
        .addFields(
          {
            name: "📊 24h Actions",
            value:
              recentActions.length > 0
                ? recentActions
                    .map((a) => `**${a.action.toUpperCase()}:** ${a.count}`)
                    .join("\n")
                : "No actions taken",
            inline: true,
          },
          {
            name: "📈 Trends",
            value: "Use `/analytics` for detailed trends",
            inline: true,
          }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dashboard_overview")
          .setLabel("Overview")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("dashboard_security")
          .setLabel("Security")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_moderation")
          .setLabel("Moderation")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_activity")
          .setLabel("Activity")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_performance")
          .setLabel("Performance")
          .setStyle(ButtonStyle.Success)
      );

      // Check if this is a button interaction (update) or command (reply)
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [buttons] });
      } else {
        await interaction.reply({ embeds: [embed], components: [buttons] });
      }
    }
  },
};

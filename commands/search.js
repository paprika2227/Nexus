const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription(
      "Advanced search across cases, notes, and logs "
    )
    .addStringOption((option) =>
      option.setName("query").setDescription("Search query").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("What to search")
        .setRequired(false)
        .addChoices(
          { name: "All", value: "all" },
          { name: "Cases", value: "cases" },
          { name: "Notes", value: "notes" },
          { name: "Warnings", value: "warnings" },
          { name: "Security Logs", value: "security" }
        )
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Filter by user").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const type = interaction.options.getString("type") || "all";
    const user = interaction.options.getUser("user");

    await interaction.deferReply();

    const results = {
      cases: [],
      notes: [],
      warnings: [],
      security: [],
    };

    // Search cases
    if (type === "all" || type === "cases") {
      let caseQuery =
        "SELECT * FROM moderation_logs WHERE guild_id = ? AND (reason LIKE ? OR action LIKE ?)";
      const params = [interaction.guild.id, `%${query}%`, `%${query}%`];

      if (user) {
        caseQuery += " AND user_id = ?";
        params.push(user.id);
      }

      caseQuery += " ORDER BY timestamp DESC LIMIT 20";

      results.cases = await new Promise((resolve, reject) => {
        db.db.all(caseQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

    // Search notes
    if (type === "all" || type === "notes") {
      let noteQuery = "SELECT * FROM notes WHERE guild_id = ? AND note LIKE ?";
      const params = [interaction.guild.id, `%${query}%`];

      if (user) {
        noteQuery += " AND user_id = ?";
        params.push(user.id);
      }

      noteQuery += " ORDER BY created_at DESC LIMIT 20";

      results.notes = await new Promise((resolve, reject) => {
        db.db.all(noteQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

    // Search warnings
    if (type === "all" || type === "warnings") {
      let warnQuery =
        "SELECT * FROM warnings WHERE guild_id = ? AND reason LIKE ?";
      const params = [interaction.guild.id, `%${query}%`];

      if (user) {
        warnQuery += " AND user_id = ?";
        params.push(user.id);
      }

      warnQuery += " ORDER BY timestamp DESC LIMIT 20";

      results.warnings = await new Promise((resolve, reject) => {
        db.db.all(warnQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

    const totalResults =
      results.cases.length +
      results.notes.length +
      results.warnings.length +
      results.security.length;

    if (totalResults === 0) {
      return interaction.editReply({
        content: `❌ No results found for "${query}"`,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Search Results for "${query}"`)
      .setDescription(`Found **${totalResults}** result(s)`)
      .setColor(0x0099ff)
      .setTimestamp();

    if (results.cases.length > 0) {
      embed.addFields({
        name: `📋 Cases (${results.cases.length})`,
        value: results.cases
          .slice(0, 5)
          .map(
            (c) =>
              `**#${c.id}** ${c.action.toUpperCase()} - <@${c.user_id}> - ${
                c.reason?.slice(0, 50) || "No reason"
              }`
          )
          .join("\n"),
        inline: false,
      });
    }

    if (results.notes.length > 0) {
      embed.addFields({
        name: `📝 Notes (${results.notes.length})`,
        value: results.notes
          .slice(0, 5)
          .map(
            (n) => `**#${n.id}** <@${n.user_id}> - ${n.note.slice(0, 50)}...`
          )
          .join("\n"),
        inline: false,
      });
    }

    if (results.warnings.length > 0) {
      embed.addFields({
        name: `⚠️ Warnings (${results.warnings.length})`,
        value: results.warnings
          .slice(0, 5)
          .map(
            (w) =>
              `**#${w.id}** <@${w.user_id}> - ${
                w.reason?.slice(0, 50) || "No reason"
              }`
          )
          .join("\n"),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
